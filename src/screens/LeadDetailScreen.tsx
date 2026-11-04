import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { apiFetch, ApiError } from '../api/client';
import { Button, Card, Pill, StagePill } from '../components/ui';
import type { PipelineStackScreenProps } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import { LOGGABLE_TYPES, type ActivityType, type LeadDetail, type Single } from '../types/api';

const VERIFICATION: Record<string, { bg: string; fg: string; label: string }> = {
    verified: { bg: '#dff3e8', fg: '#137347', label: 'Terverifikasi' },
    unverified: { bg: '#fff2d6', fg: '#8a5e00', label: 'Belum verifikasi' },
    rejected: { bg: '#fbe6e6', fg: '#a83434', label: 'Ditolak' },
};

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function LeadDetailScreen({
    route,
    navigation,
}: PipelineStackScreenProps<'LeadDetail'>) {
    const { leadId, company } = route.params;
    const [lead, setLead] = useState<LeadDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | undefined>();

    const [type, setType] = useState<ActivityType>('CALL');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    useLayoutEffect(() => {
        navigation.setOptions({ title: company });
    }, [navigation, company]);

    const load = useCallback(async () => {
        try {
            setError(undefined);
            const res = await apiFetch<Single<LeadDetail>>(`/leads/${leadId}`);
            setLead(res.data);
        } catch {
            setError('Gagal memuat detail lead.');
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    useEffect(() => {
        load();
    }, [load]);

    const logActivity = async () => {
        setSaving(true);
        try {
            await apiFetch(`/leads/${leadId}/activities`, {
                method: 'POST',
                body: { type, note: note.trim() || undefined },
            });
            setNote('');
            setType('CALL');
            await load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Gagal mencatat aktivitas.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.navy} />
            </View>
        );
    }

    if (!lead) {
        return (
            <View style={styles.center}>
                <Text style={styles.error}>{error ?? 'Lead tidak ditemukan.'}</Text>
            </View>
        );
    }

    const verification = VERIFICATION[lead.verification_status];

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <Card style={{ gap: spacing.sm }}>
                <View style={styles.rowBetween}>
                    <StagePill stage={lead.stage} label={lead.stage_label} />
                    {verification ? (
                        <Pill bg={verification.bg} fg={verification.fg}>
                            {verification.label}
                        </Pill>
                    ) : null}
                </View>
                {lead.contact_name ? (
                    <Text style={styles.contact}>
                        {lead.contact_name}
                        {lead.contact_title ? ` · ${lead.contact_title}` : ''}
                    </Text>
                ) : null}
                {lead.phone ? <Info label="Telepon" value={lead.phone} /> : null}
                {lead.address ? <Info label="Alamat" value={lead.address} /> : null}
                {lead.bandwidth ? <Info label="Bandwidth" value={lead.bandwidth} /> : null}
                {lead.next_step ? <Info label="Langkah berikutnya" value={lead.next_step} /> : null}
            </Card>

            <Card style={{ gap: spacing.md }}>
                <Text style={styles.sectionTitle}>Catat aktivitas</Text>
                <View style={styles.chips}>
                    {LOGGABLE_TYPES.map((t) => {
                        const active = t.value === type;
                        return (
                            <Pressable
                                key={t.value}
                                onPress={() => setType(t.value)}
                                style={[styles.chip, active && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                    {t.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
                <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="Catatan (opsional)"
                    placeholderTextColor={colors.mutedink}
                    style={styles.noteInput}
                    multiline
                />
                <Button label="Simpan aktivitas" onPress={logActivity} loading={saving} />
            </Card>

            <Text style={styles.sectionTitle}>Timeline</Text>
            {lead.activities.length === 0 ? (
                <Text style={styles.empty}>Belum ada aktivitas.</Text>
            ) : (
                lead.activities.map((a) => (
                    <View key={a.id} style={styles.timelineRow}>
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineBody}>
                            <Text style={styles.activityTitle}>{a.title}</Text>
                            {a.note ? <Text style={styles.activityNote}>{a.note}</Text> : null}
                            <Text style={styles.activityMeta}>
                                {a.type_label}
                                {a.user ? ` · ${a.user}` : ''} · {formatDateTime(a.occurred_at)}
                            </Text>
                        </View>
                    </View>
                ))
            )}
        </ScrollView>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.info}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.softbg },
    content: { padding: spacing.lg, gap: spacing.lg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softbg },
    error: { color: colors.danger },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    contact: { fontSize: 16, fontWeight: '700', color: colors.ink },
    info: { gap: 2 },
    infoLabel: { fontSize: 11, fontWeight: '700', color: colors.mutedink, textTransform: 'uppercase' },
    infoValue: { fontSize: 15, color: colors.ink },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.mutedink, textTransform: 'uppercase' },
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
    noteInput: {
        minHeight: 64,
        borderRadius: radius.btn,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.white,
        padding: spacing.md,
        fontSize: 15,
        color: colors.ink,
        textAlignVertical: 'top',
    },
    empty: { color: colors.mutedink, paddingVertical: spacing.md },
    timelineRow: { flexDirection: 'row', gap: spacing.md },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.teal,
        marginTop: 5,
    },
    timelineBody: { flex: 1, gap: 2, paddingBottom: spacing.md },
    activityTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
    activityNote: { fontSize: 14, color: colors.ink },
    activityMeta: { fontSize: 12, color: colors.mutedink },
});
