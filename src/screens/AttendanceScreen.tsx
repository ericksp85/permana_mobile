import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch, ApiError } from '../api/client';
import { Button, Card, Pill } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import type { Attendance, AttendanceIndex, Geofence } from '../types/api';

type Coords = { lat: number; lng: number };

type Selfie = { uri: string; dataUrl: string };

/** Great-circle distance in metres between two coordinates. */
function distanceMeters(a: Coords, b: Coords): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

function timeOf(iso: string): string {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function dayOf(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

function metresLabel(m: number): string {
    return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

export default function AttendanceScreen() {
    const [data, setData] = useState<AttendanceIndex | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const [coords, setCoords] = useState<Coords | null>(null);
    const [selfie, setSelfie] = useState<Selfie | null>(null);
    const [reason, setReason] = useState('');
    const [reasonRequired, setReasonRequired] = useState(false);
    const [locating, setLocating] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(async () => {
        try {
            setError(undefined);
            const res = await apiFetch<AttendanceIndex>('/attendance');
            setData(res);
        } catch {
            setError('Gagal memuat data absensi.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const today = data?.today ?? null;
    const geofence = data?.geofence ?? null;

    // Distance from the captured check-in point to the office, for feedback
    // before we submit. The server makes the authoritative call.
    const capturedDistance =
        coords && geofence ? distanceMeters(coords, { lat: geofence.lat, lng: geofence.lng }) : null;
    const likelyOutside =
        capturedDistance !== null && geofence ? capturedDistance > geofence.radius_m : false;

    const captureLocation = async (): Promise<Coords | null> => {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') {
            Alert.alert('Izin lokasi', 'Aktifkan izin lokasi untuk melakukan absensi.');
            return null;
        }
        const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });
        return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    };

    const takeSelfie = async (): Promise<Selfie | null> => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Izin kamera', 'Aktifkan izin kamera untuk mengambil selfie absensi.');
            return null;
        }
        const result = await ImagePicker.launchCameraAsync({
            cameraType: ImagePicker.CameraType.front,
            mediaTypes: ['images'],
            base64: true,
            quality: 0.5,
            allowsEditing: false,
        });
        if (result.canceled || !result.assets?.[0]?.base64) return null;
        const asset = result.assets[0];
        const mime = asset.mimeType ?? 'image/jpeg';
        return { uri: asset.uri, dataUrl: `data:${mime};base64,${asset.base64}` };
    };

    // Grab GPS and selfie in one tap so the point and the photo match.
    const prepareCheckIn = async () => {
        setError(undefined);
        setLocating(true);
        try {
            const where = await captureLocation();
            if (!where) return;
            setCoords(where);
            const shot = await takeSelfie();
            if (!shot) return;
            setSelfie(shot);
        } catch {
            setError('Gagal mengambil lokasi atau foto.');
        } finally {
            setLocating(false);
        }
    };

    const submitCheckIn = async () => {
        if (!coords || !selfie) return;
        if ((reasonRequired || likelyOutside) && !reason.trim()) {
            setReasonRequired(true);
            setError('Anda di luar area kantor — isi alasan untuk tetap absen.');
            return;
        }
        setSubmitting(true);
        setError(undefined);
        try {
            await apiFetch<Attendance>('/attendance/check-in', {
                method: 'POST',
                body: {
                    lat: coords.lat,
                    lng: coords.lng,
                    selfie: selfie.dataUrl,
                    reason: reason.trim() || undefined,
                },
            });
            setCoords(null);
            setSelfie(null);
            setReason('');
            setReasonRequired(false);
            await load();
        } catch (e) {
            if (e instanceof ApiError && e.status === 422 && /geofence|area|luar/i.test(e.message)) {
                // Server rejected for being outside — reveal the reason field.
                setReasonRequired(true);
                setError('Anda di luar area kantor — isi alasan untuk tetap absen.');
            } else {
                setError(e instanceof ApiError ? e.message : 'Gagal check-in.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const checkOut = async () => {
        setSubmitting(true);
        setError(undefined);
        try {
            const where = await captureLocation();
            if (!where) return;
            await apiFetch<Attendance>('/attendance/check-out', {
                method: 'POST',
                body: { lat: where.lat, lng: where.lng },
            });
            await load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Gagal check-out.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator color={colors.navy} />
            </SafeAreaView>
        );
    }

    const checkedIn = !!today?.check_in_at;
    const checkedOut = !!today?.check_out_at;

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            load();
                        }}
                        tintColor={colors.navy}
                    />
                }
            >
                <Text style={styles.title}>Absensi</Text>

                {geofence ? (
                    <Card style={{ gap: spacing.xs }}>
                        <Text style={styles.cardLabel}>Kantor</Text>
                        <Text style={styles.office}>{geofence.name}</Text>
                        {geofence.address ? (
                            <Text style={styles.officeSub}>{geofence.address}</Text>
                        ) : null}
                        <Text style={styles.officeSub}>Radius {metresLabel(geofence.radius_m)}</Text>
                    </Card>
                ) : null}

                {/* Today's status */}
                <Card style={{ gap: spacing.sm }}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.cardLabel}>Hari ini</Text>
                        {checkedOut ? (
                            <Pill bg="#dff3e8" fg="#137347">Selesai</Pill>
                        ) : checkedIn ? (
                            <Pill bg="#e8eff4" fg="#2c5d78">Sudah check-in</Pill>
                        ) : (
                            <Pill bg="#fff2d6" fg="#8a5e00">Belum absen</Pill>
                        )}
                    </View>

                    {checkedIn ? (
                        <>
                            <View style={styles.timeRow}>
                                <TimeStat label="Masuk" value={timeOf(today!.check_in_at!)} />
                                <TimeStat
                                    label="Keluar"
                                    value={today!.check_out_at ? timeOf(today!.check_out_at) : '—'}
                                />
                            </View>
                            <View style={styles.badgeRow}>
                                {today!.inside_geofence ? (
                                    <Pill bg="#dff3e8" fg="#137347">Dalam area kantor</Pill>
                                ) : (
                                    <Pill bg="#fbe6e6" fg="#a83434">Luar area kantor</Pill>
                                )}
                                {today!.distance_m !== null ? (
                                    <Pill bg="#eef2f5" fg={colors.mutedink}>
                                        {metresLabel(today!.distance_m)} dari kantor
                                    </Pill>
                                ) : null}
                            </View>
                            {today!.check_in_reason ? (
                                <Text style={styles.reasonNote}>Alasan: {today!.check_in_reason}</Text>
                            ) : null}
                        </>
                    ) : (
                        <Text style={styles.officeSub}>Ambil selfie dan lokasi untuk check-in.</Text>
                    )}
                </Card>

                {/* Action area */}
                {!checkedIn ? (
                    <Card style={{ gap: spacing.md }}>
                        {selfie ? (
                            <Image source={{ uri: selfie.uri }} style={styles.preview} />
                        ) : null}

                        {coords ? (
                            <Text style={styles.coordNote}>
                                Lokasi terekam
                                {capturedDistance !== null
                                    ? ` · ${metresLabel(capturedDistance)} dari kantor`
                                    : ''}
                            </Text>
                        ) : null}

                        {(reasonRequired || likelyOutside) && selfie ? (
                            <View style={{ gap: spacing.xs }}>
                                <Text style={styles.fieldLabel}>Alasan di luar area</Text>
                                <TextInput
                                    value={reason}
                                    onChangeText={setReason}
                                    placeholder="Mis. kunjungan klien, kerja lapangan"
                                    placeholderTextColor={colors.mutedink}
                                    style={styles.reasonInput}
                                    multiline
                                />
                            </View>
                        ) : null}

                        {error ? <Text style={styles.error}>{error}</Text> : null}

                        {!selfie ? (
                            <Button
                                label="Ambil lokasi & selfie"
                                onPress={prepareCheckIn}
                                loading={locating}
                            />
                        ) : (
                            <View style={{ gap: spacing.sm }}>
                                <Button
                                    label="Check-in sekarang"
                                    onPress={submitCheckIn}
                                    loading={submitting}
                                />
                                <Button
                                    label="Ambil ulang"
                                    variant="ghost"
                                    onPress={prepareCheckIn}
                                    loading={locating}
                                />
                            </View>
                        )}
                    </Card>
                ) : !checkedOut ? (
                    <Card style={{ gap: spacing.sm }}>
                        {error ? <Text style={styles.error}>{error}</Text> : null}
                        <Button label="Check-out" onPress={checkOut} loading={submitting} />
                    </Card>
                ) : null}

                {/* History */}
                {data?.history && data.history.length > 0 ? (
                    <View style={{ gap: spacing.sm }}>
                        <Text style={styles.cardLabel}>Riwayat</Text>
                        {data.history.map((row) => (
                            <Card key={row.id} style={styles.historyCard}>
                                <Text style={styles.historyDate}>{dayOf(row.date)}</Text>
                                <Text style={styles.historyTime}>
                                    {row.check_in_at ? timeOf(row.check_in_at) : '—'}
                                    {' – '}
                                    {row.check_out_at ? timeOf(row.check_out_at) : '…'}
                                </Text>
                                {row.inside_geofence ? (
                                    <Pill bg="#dff3e8" fg="#137347">Dalam area</Pill>
                                ) : (
                                    <Pill bg="#fbe6e6" fg="#a83434">Luar area</Pill>
                                )}
                            </Card>
                        ))}
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

function TimeStat({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.timeStat}>
            <Text style={styles.timeStatLabel}>{label}</Text>
            <Text style={styles.timeStatValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.softbg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softbg },
    content: { padding: spacing.lg, gap: spacing.lg },
    title: { fontSize: 24, fontWeight: '800', color: colors.ink },
    cardLabel: { fontSize: 13, fontWeight: '800', color: colors.mutedink, textTransform: 'uppercase' },
    office: { fontSize: 17, fontWeight: '700', color: colors.ink },
    officeSub: { fontSize: 13, color: colors.mutedink },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timeRow: { flexDirection: 'row', gap: spacing.lg },
    timeStat: { gap: 2 },
    timeStatLabel: { fontSize: 11, fontWeight: '700', color: colors.mutedink, textTransform: 'uppercase' },
    timeStatValue: { fontSize: 20, fontWeight: '800', color: colors.ink },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    reasonNote: { fontSize: 13, color: colors.ink },
    preview: {
        width: '100%',
        height: 220,
        borderRadius: radius.btn,
        backgroundColor: colors.line,
    },
    coordNote: { fontSize: 13, fontWeight: '600', color: colors.blue },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.mutedink },
    reasonInput: {
        minHeight: 56,
        borderRadius: radius.btn,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.white,
        padding: spacing.md,
        fontSize: 15,
        color: colors.ink,
        textAlignVertical: 'top',
    },
    error: { fontSize: 13, color: colors.danger },
    historyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    historyDate: { fontSize: 14, fontWeight: '700', color: colors.ink, width: 90 },
    historyTime: { fontSize: 14, color: colors.ink, flex: 1 },
});
