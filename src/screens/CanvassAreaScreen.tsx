import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { apiFetch, ApiError } from '../api/client';
import { Button, Card, PagedList, Pill } from '../components/ui';
import type { MoreStackScreenProps } from '../navigation/types';
import { useOffline } from '../offline/OfflineContext';
import SyncBanner from '../offline/SyncBanner';
import { submitOrQueue } from '../offline/sync';
import { colors, radius, spacing } from '../theme';
import {
    CANVASS_RESULTS,
    type CanvassAreaDetail,
    type CanvassResult,
    type CanvassVisit,
    type Single,
} from '../types/api';

type Coords = { lat: number; lng: number };
type Photo = { uri: string; dataUrl: string };
/** A visit logged while offline, shown optimistically until it syncs. */
type PendingVisit = { tempId: string; name: string; result: CanvassResult; note: string | null };

function resultStyle(result: CanvassResult): { bg: string; fg: string } {
    const r = CANVASS_RESULTS.find((x) => x.value === result);
    return r ? { bg: r.bg, fg: r.fg } : { bg: colors.line, fg: colors.ink };
}

function whenLabel(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function CanvassAreaScreen({
    route,
    navigation,
}: MoreStackScreenProps<'CanvassArea'>) {
    const { areaId, name } = route.params;
    const { online } = useOffline();
    const [area, setArea] = useState<CanvassAreaDetail | null>(null);
    const [queued, setQueued] = useState<PendingVisit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | undefined>();

    // New-visit form
    const [visitName, setVisitName] = useState('');
    const [result, setResult] = useState<CanvassResult>('interested');
    const [note, setNote] = useState('');
    const [coords, setCoords] = useState<Coords | null>(null);
    const [photo, setPhoto] = useState<Photo | null>(null);
    const [busy, setBusy] = useState(false);
    const [saving, setSaving] = useState(false);
    const [convertingId, setConvertingId] = useState<number | null>(null);

    useLayoutEffect(() => {
        navigation.setOptions({ title: name });
    }, [navigation, name]);

    const load = useCallback(async () => {
        try {
            setError(undefined);
            const res = await apiFetch<Single<CanvassAreaDetail>>(`/canvass/${areaId}`);
            setArea(res.data);
            // Server is authoritative once we can read it — drop local optimistic rows.
            setQueued([]);
        } catch {
            setError('Couldn’t load area.');
        } finally {
            setLoading(false);
        }
    }, [areaId]);

    useEffect(() => {
        load();
    }, [load]);

    const captureLocation = async () => {
        setBusy(true);
        try {
            const perm = await Location.requestForegroundPermissionsAsync();
            if (perm.status !== 'granted') {
                Alert.alert('Location permission', 'Enable location to log a visit.');
                return;
            }
            const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } catch {
            setError('Couldn’t get location.');
        } finally {
            setBusy(false);
        }
    };

    const takePhoto = async () => {
        setBusy(true);
        try {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
                Alert.alert('Camera permission', 'Enable the camera to photograph the location.');
                return;
            }
            const res = await ImagePicker.launchCameraAsync({
                cameraType: ImagePicker.CameraType.back,
                mediaTypes: ['images'],
                base64: true,
                quality: 0.5,
                allowsEditing: false,
            });
            if (res.canceled || !res.assets?.[0]?.base64) return;
            const asset = res.assets[0];
            const mime = asset.mimeType ?? 'image/jpeg';
            setPhoto({ uri: asset.uri, dataUrl: `data:${mime};base64,${asset.base64}` });
        } catch {
            setError('Couldn’t take photo.');
        } finally {
            setBusy(false);
        }
    };

    const resetForm = () => {
        setVisitName('');
        setResult('interested');
        setNote('');
        setCoords(null);
        setPhoto(null);
    };

    const saveVisit = async () => {
        if (!visitName.trim()) {
            setError('Place name is required.');
            return;
        }
        setSaving(true);
        setError(undefined);
        const payload = {
            name: visitName.trim(),
            result,
            note: note.trim() || undefined,
            lat: coords?.lat,
            lng: coords?.lng,
            photo: photo?.dataUrl,
        };
        try {
            const res = await submitOrQueue<Single<CanvassVisit>>(online, {
                kind: 'visit',
                label: `Visit · ${payload.name}`,
                path: `/canvass/${areaId}/visits`,
                body: payload,
            });
            resetForm();
            if (res.queued) {
                setQueued((prev) => [
                    { tempId: `${Date.now()}`, name: payload.name, result, note: payload.note ?? null },
                    ...prev,
                ]);
                Alert.alert('Saved offline', 'This visit will sync automatically when you’re back online.');
            } else {
                await load();
            }
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Couldn’t save visit.');
        } finally {
            setSaving(false);
        }
    };

    const convert = async (visit: CanvassVisit) => {
        setConvertingId(visit.id);
        setError(undefined);
        try {
            await apiFetch(`/canvass/visits/${visit.id}/convert`, { method: 'POST' });
            Alert.alert('Lead created', `${visit.name} is now in the pipeline.`);
            await load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Couldn’t create lead.');
        } finally {
            setConvertingId(null);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.navy} />
            </View>
        );
    }

    if (!area) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error ?? 'Area not found.'}</Text>
            </View>
        );
    }

    const interested = area.visits.filter((v) => v.result === 'interested').length;

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <SyncBanner />
            <Text style={styles.sectionTitle}>Area progress</Text>
            <Card style={styles.progressCard}>
                <View>
                    <Text style={styles.progressNum}>
                        {area.visits.length}
                        <Text style={styles.progressTarget}> / {area.target_units}</Text>
                    </Text>
                    <Text style={styles.progressLabel}>Visits</Text>
                </View>
                <View style={styles.progressDivider} />
                <View>
                    <Text style={[styles.progressNum, { color: colors.tealDark }]}>{interested}</Text>
                    <Text style={styles.progressLabel}>Interested</Text>
                </View>
            </Card>

            {/* New visit form */}
            <Card style={{ gap: spacing.md }}>
                <Text style={styles.sectionTitle}>New visit</Text>
                <TextInput
                    value={visitName}
                    onChangeText={setVisitName}
                    placeholder="Place / business name"
                    accessibilityLabel="Place / business name"
                    placeholderTextColor={colors.mutedink}
                    style={styles.input}
                />
                <View style={styles.chips}>
                    {CANVASS_RESULTS.map((r) => {
                        const active = r.value === result;
                        return (
                            <Pressable
                                key={r.value}
                                onPress={() => setResult(r.value)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                                style={[styles.chip, active && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                    {r.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
                <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="Note (optional)"
                    accessibilityLabel="Note (optional)"
                    placeholderTextColor={colors.mutedink}
                    style={[styles.input, styles.noteInput]}
                    multiline
                />

                {photo ? <Image source={{ uri: photo.uri }} style={styles.preview} /> : null}

                <View style={styles.captureRow}>
                    <Pressable
                        onPress={captureLocation}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: busy }}
                        style={[styles.captureBtn, coords && styles.captureBtnDone]}
                    >
                        <Ionicons
                            name={coords ? 'checkmark-circle' : 'location-outline'}
                            size={18}
                            color={coords ? colors.success : colors.navy}
                        />
                        <Text style={styles.captureText}>{coords ? 'Location ✓' : 'Location'}</Text>
                    </Pressable>
                    <Pressable
                        onPress={takePhoto}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: busy }}
                        style={[styles.captureBtn, photo && styles.captureBtnDone]}
                    >
                        <Ionicons
                            name={photo ? 'checkmark-circle' : 'camera-outline'}
                            size={18}
                            color={photo ? colors.success : colors.navy}
                        />
                        <Text style={styles.captureText}>{photo ? 'Photo ✓' : 'Photo'}</Text>
                    </Pressable>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Button label="Log visit at my location" onPress={saveVisit} loading={saving} />
            </Card>

            {/* Visit list */}
            <Text style={styles.sectionTitle}>Visits</Text>
            {queued.map((q) => {
                const rs = resultStyle(q.result);
                return (
                    <Card key={q.tempId} style={[styles.visitCard, styles.visitCardPending]}>
                        <View style={styles.visitTop}>
                            <Text style={styles.visitName} numberOfLines={1}>
                                {q.name}
                            </Text>
                            <Pill bg={rs.bg} fg={rs.fg}>
                                {CANVASS_RESULTS.find((x) => x.value === q.result)?.label ?? q.result}
                            </Pill>
                        </View>
                        {q.note ? <Text style={styles.visitNote}>{q.note}</Text> : null}
                        <Pill bg="#fff2d6" fg="#8a5e00">Pending sync</Pill>
                    </Card>
                );
            })}
            {area.visits.length === 0 && queued.length === 0 ? (
                <Text style={styles.empty}>No visits in this area yet.</Text>
            ) : (
                <PagedList
                    items={area.visits}
                    renderItem={(v) => {
                    const rs = resultStyle(v.result);
                    const canConvert = v.result === 'interested' && v.lead_id === null;
                    return (
                        <Card key={v.id} style={styles.visitCard}>
                            <View style={styles.visitTop}>
                                <Text style={styles.visitName} numberOfLines={1}>
                                    {v.name}
                                </Text>
                                <Pill bg={rs.bg} fg={rs.fg}>
                                    {v.result_label}
                                </Pill>
                            </View>
                            {v.note ? <Text style={styles.visitNote}>{v.note}</Text> : null}
                            <View style={styles.visitMetaRow}>
                                <Text style={styles.visitMeta}>{whenLabel(v.created_at)}</Text>
                                {v.has_photo ? (
                                    <View style={styles.metaIcon}>
                                        <Ionicons name="image-outline" size={14} color={colors.mutedink} />
                                        <Text style={styles.visitMeta}>Photo</Text>
                                    </View>
                                ) : null}
                                {v.lat !== null ? (
                                    <View style={styles.metaIcon}>
                                        <Ionicons name="location-outline" size={14} color={colors.mutedink} />
                                        <Text style={styles.visitMeta}>GPS</Text>
                                    </View>
                                ) : null}
                            </View>
                            {v.lead_id !== null ? (
                                <Pill bg="#e8eff4" fg="#2c5d78">Converted to lead</Pill>
                            ) : canConvert ? (
                                <Button
                                    label="Convert to lead"
                                    variant="ghost"
                                    loading={convertingId === v.id}
                                    onPress={() => convert(v)}
                                />
                            ) : null}
                        </Card>
                    );
                    }}
                />
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.softbg },
    content: { padding: spacing.lg, gap: spacing.lg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softbg },
    errorText: { fontSize: 13, color: colors.danger },
    progressCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
    progressNum: { fontSize: 28, fontWeight: '800', color: colors.ink },
    progressTarget: { fontSize: 18, fontWeight: '700', color: colors.mutedink },
    progressLabel: { fontSize: 12, fontWeight: '700', color: colors.mutedink, textTransform: 'uppercase' },
    progressDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.line },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.mutedink, textTransform: 'uppercase' },
    input: {
        borderRadius: radius.btn,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.white,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: 15,
        color: colors.ink,
    },
    noteInput: { minHeight: 56, textAlignVertical: 'top' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.white,
    },
    chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.ink },
    chipTextActive: { color: colors.white },
    preview: { width: '100%', height: 200, borderRadius: radius.btn, backgroundColor: colors.line },
    captureRow: { flexDirection: 'row', gap: spacing.md },
    captureBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        height: 46,
        borderRadius: radius.btn,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.softbg,
    },
    captureBtnDone: { borderColor: colors.success, backgroundColor: '#eefaf3' },
    captureText: { fontSize: 14, fontWeight: '700', color: colors.navy },
    empty: { color: colors.mutedink, paddingVertical: spacing.md },
    visitCard: { gap: spacing.sm },
    visitCardPending: { borderWidth: 1, borderColor: '#f0dca8', backgroundColor: '#fffaf0' },
    visitTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    visitName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
    visitNote: { fontSize: 14, color: colors.ink },
    visitMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
    visitMeta: { fontSize: 12, color: colors.mutedink },
    metaIcon: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
