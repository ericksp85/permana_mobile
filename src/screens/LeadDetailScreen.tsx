import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { apiFetch, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, Pill, StagePill, rupiah } from '../components/ui';
import { QuotationStepper } from './QuotationsScreen';
import type { PipelineStackScreenProps } from '../navigation/types';
import { useOffline } from '../offline/OfflineContext';
import SyncBanner from '../offline/SyncBanner';
import { submitOrQueue } from '../offline/sync';
import { colors, radius, spacing } from '../theme';
import {
    LOGGABLE_TYPES,
    QUOTATION_DISCOUNTS,
    QUOTATION_STATUS_STYLE,
    QUOTATION_TERMS,
    type ActivityType,
    type LeadDetail,
    type Paginated,
    type Quotation,
    type Single,
} from '../types/api';

/** An activity logged while offline, shown optimistically until it syncs. */
type PendingActivity = { tempId: string; typeLabel: string; note: string | null };

const VERIFICATION: Record<string, { bg: string; fg: string; label: string }> = {
    verified: { bg: '#dff3e8', fg: '#137347', label: 'Verified' },
    unverified: { bg: '#fff2d6', fg: '#8a5e00', label: 'Unverified' },
    rejected: { bg: '#fbe6e6', fg: '#a83434', label: 'Rejected' },
};

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
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
    const { user } = useAuth();
    const { online } = useOffline();
    const [lead, setLead] = useState<LeadDetail | null>(null);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [queuedActivities, setQueuedActivities] = useState<PendingActivity[]>([]);
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
            const [leadRes, quoteRes] = await Promise.all([
                apiFetch<Single<LeadDetail>>(`/leads/${leadId}`),
                apiFetch<Paginated<Quotation>>('/quotations', { query: { lead_id: leadId } }),
            ]);
            setLead(leadRes.data);
            setQuotations(quoteRes.data);
            // Server timeline is authoritative once we can read it.
            setQueuedActivities([]);
        } catch {
            setError('Couldn’t load lead details.');
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    useEffect(() => {
        load();
    }, [load]);

    const logActivity = async () => {
        const trimmed = note.trim();
        const activityType = type;
        setSaving(true);
        setError(undefined);
        try {
            const res = await submitOrQueue(online, {
                kind: 'activity',
                label: `Activity · ${company}`,
                path: `/leads/${leadId}/activities`,
                body: { type: activityType, note: trimmed || undefined },
            });
            setNote('');
            setType('CALL');
            if (res.queued) {
                const label =
                    LOGGABLE_TYPES.find((t) => t.value === activityType)?.label ?? activityType;
                setQueuedActivities((prev) => [
                    {
                        tempId: `${Date.now()}`,
                        typeLabel: label,
                        note: trimmed || null,
                    },
                    ...prev,
                ]);
            } else {
                await load();
            }
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Couldn’t log activity.');
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
                <Text style={styles.error}>{error ?? 'Lead not found.'}</Text>
            </View>
        );
    }

    const verification = VERIFICATION[lead.verification_status];
    const canManageQuote = user?.id === lead.owner_id;

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <SyncBanner />
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
                {lead.phone || (lead.lat !== null && lead.lng !== null) ? (
                    <View style={styles.contactActions}>
                        {lead.phone ? (
                            <ContactAction
                                icon="call-outline"
                                label="Call"
                                onPress={() => Linking.openURL(`tel:${lead.phone}`)}
                            />
                        ) : null}
                        {lead.phone ? (
                            <ContactAction
                                icon="logo-whatsapp"
                                label="WhatsApp"
                                onPress={() =>
                                    Linking.openURL(
                                        `https://wa.me/${lead.phone!.replace(/[^0-9]/g, '')}`,
                                    )
                                }
                            />
                        ) : null}
                        {lead.lat !== null && lead.lng !== null ? (
                            <ContactAction
                                icon="navigate-outline"
                                label="Navigate"
                                onPress={() =>
                                    Linking.openURL(
                                        `https://maps.google.com/?q=${lead.lat},${lead.lng}`,
                                    )
                                }
                            />
                        ) : null}
                    </View>
                ) : null}
                {lead.phone ? <Info label="Phone" value={lead.phone} /> : null}
                {lead.address ? <Info label="Address" value={lead.address} /> : null}
                {lead.bandwidth ? <Info label="Bandwidth" value={lead.bandwidth} /> : null}
                {lead.next_step ? <Info label="Next step" value={lead.next_step} /> : null}
            </Card>

            <QuotationSection
                leadId={leadId}
                quotations={quotations}
                canManage={canManageQuote}
                defaultBandwidth={lead.bandwidth}
                onChanged={load}
            />

            <Card style={{ gap: spacing.md }}>
                <Text style={styles.sectionTitle}>Log activity</Text>
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
                    placeholder="Note (optional)"
                    placeholderTextColor={colors.mutedink}
                    style={styles.noteInput}
                    multiline
                />
                <Button label="Save activity" onPress={logActivity} loading={saving} />
            </Card>

            <Text style={styles.sectionTitle}>Activity</Text>
            {queuedActivities.map((q) => (
                <View key={q.tempId} style={styles.timelineRow}>
                    <View style={[styles.timelineDot, styles.timelineDotPending]} />
                    <View style={styles.timelineBody}>
                        <Text style={styles.activityTitle}>{q.typeLabel}</Text>
                        {q.note ? <Text style={styles.activityNote}>{q.note}</Text> : null}
                        <Pill bg="#fff2d6" fg="#8a5e00">Pending sync</Pill>
                    </View>
                </View>
            ))}
            {lead.activities.length === 0 && queuedActivities.length === 0 ? (
                <Text style={styles.empty}>No activity yet.</Text>
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

function QuotationSection({
    leadId,
    quotations,
    canManage,
    defaultBandwidth,
    onChanged,
}: {
    leadId: number;
    quotations: Quotation[];
    canManage: boolean;
    defaultBandwidth: string | null;
    onChanged: () => Promise<void>;
}) {
    const latest = quotations[0];
    const bounced = latest?.status === 'returned' || latest?.status === 'rejected';
    const showForm = canManage && (!latest || bounced);
    const showSend = canManage && latest?.status === 'approved';

    const [bandwidth, setBandwidth] = useState(defaultBandwidth ?? '');
    const [mrc, setMrc] = useState('');
    const [otc, setOtc] = useState('');
    const [term, setTerm] = useState<number>(12);
    const [discount, setDiscount] = useState<number>(0);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | undefined>();

    const mrcNum = parseInt(mrc, 10) || 0;
    const netPreview = Math.round(mrcNum * (1 - discount / 100));

    const submit = async () => {
        if (mrcNum < 1) {
            setErr('MRC is required.');
            return;
        }
        setBusy(true);
        setErr(undefined);
        try {
            await apiFetch(`/leads/${leadId}/quotations`, {
                method: 'POST',
                body: {
                    bandwidth: bandwidth.trim() || undefined,
                    mrc: mrcNum,
                    otc: parseInt(otc, 10) || 0,
                    term_months: term,
                    discount_pct: discount,
                },
            });
            setMrc('');
            setOtc('');
            await onChanged();
        } catch (e) {
            setErr(e instanceof ApiError ? e.message : 'Couldn’t submit quotation.');
        } finally {
            setBusy(false);
        }
    };

    const send = async () => {
        if (!latest) return;
        setBusy(true);
        setErr(undefined);
        try {
            await apiFetch(`/quotations/${latest.id}/send`, { method: 'POST' });
            await onChanged();
        } catch (e) {
            setErr(e instanceof ApiError ? e.message : 'Couldn’t send to client.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card style={{ gap: spacing.md }}>
            <Text style={styles.sectionTitle}>Quotation</Text>

            {quotations.map((q) => {
                const st = QUOTATION_STATUS_STYLE[q.status];
                return (
                    <View key={q.id} style={styles.quote}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.quoteMrc}>{rupiah(q.net_mrc)}/mo</Text>
                            <Pill bg={st.bg} fg={st.fg}>
                                {q.status_label}
                            </Pill>
                        </View>
                        <Text style={styles.quoteTerms}>
                            {q.number ? `${q.number} · ` : ''}
                            {q.term_months} mo
                            {q.discount_pct > 0 ? ` · ${q.discount_pct}% off` : ''}
                        </Text>
                        <QuotationStepper step={q.completed_step} />
                        {q.status === 'returned' && q.admin_note ? (
                            <Text style={styles.quoteNote}>Returned: {q.admin_note}</Text>
                        ) : null}
                        {q.status === 'rejected' && q.gm_note ? (
                            <Text style={styles.quoteNote}>Rejected: {q.gm_note}</Text>
                        ) : null}
                    </View>
                );
            })}

            {quotations.length === 0 && !showForm ? (
                <Text style={styles.empty}>No quotation yet.</Text>
            ) : null}

            {showSend ? (
                <Button label="Send to client" onPress={send} loading={busy} />
            ) : null}

            {showForm ? (
                <View style={{ gap: spacing.md }}>
                    <Text style={styles.formTitle}>
                        {bounced ? 'Revise & resubmit' : 'Request quotation'}
                    </Text>
                    <TextInput
                        value={bandwidth}
                        onChangeText={setBandwidth}
                        placeholder="Bandwidth (e.g. 50 Mbps)"
                        placeholderTextColor={colors.mutedink}
                        style={styles.input}
                    />
                    <View style={styles.amountRow}>
                        <TextInput
                            value={mrc}
                            onChangeText={setMrc}
                            placeholder="MRC / mo"
                            placeholderTextColor={colors.mutedink}
                            keyboardType="number-pad"
                            style={[styles.input, { flex: 1 }]}
                        />
                        <TextInput
                            value={otc}
                            onChangeText={setOtc}
                            placeholder="OTC (optional)"
                            placeholderTextColor={colors.mutedink}
                            keyboardType="number-pad"
                            style={[styles.input, { flex: 1 }]}
                        />
                    </View>
                    <OptionRow
                        label="Contract term"
                        options={QUOTATION_TERMS.map((t) => ({ value: t, label: `${t} mo` }))}
                        value={term}
                        onChange={setTerm}
                    />
                    <OptionRow
                        label="Discount"
                        options={QUOTATION_DISCOUNTS.map((d) => ({ value: d, label: `${d}%` }))}
                        value={discount}
                        onChange={setDiscount}
                    />
                    {mrcNum > 0 ? (
                        <Text style={styles.netPreview}>Net MRC: {rupiah(netPreview)}/mo</Text>
                    ) : null}
                    {discount >= 10 ? (
                        <Text style={styles.discountHint}>
                            Discount ≥ 10% — add a justification note for the GM.
                        </Text>
                    ) : null}
                    {err ? <Text style={styles.error}>{err}</Text> : null}
                    <Button
                        label={bounced ? 'Resubmit' : 'Submit for verification'}
                        onPress={submit}
                        loading={busy}
                    />
                </View>
            ) : err ? (
                <Text style={styles.error}>{err}</Text>
            ) : null}
        </Card>
    );
}

function OptionRow<T extends number>({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <View style={{ gap: spacing.xs }}>
            <Text style={styles.optLabel}>{label}</Text>
            <View style={styles.chips}>
                {options.map((o) => {
                    const active = o.value === value;
                    return (
                        <Pressable
                            key={o.value}
                            onPress={() => onChange(o.value)}
                            style={[styles.chip, active && styles.chipActive]}
                        >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                {o.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

function ContactAction({
    icon,
    label,
    onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.contactAction, pressed && { opacity: 0.6 }]}
        >
            <Ionicons name={icon} size={18} color={colors.navy} />
            <Text style={styles.contactActionText}>{label}</Text>
        </Pressable>
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
    error: { color: colors.danger, fontSize: 13 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    contact: { fontSize: 16, fontWeight: '700', color: colors.ink },
    contactActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    contactAction: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 42,
        borderRadius: radius.btn,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.softbg,
    },
    contactActionText: { fontSize: 13, fontWeight: '700', color: colors.navy },
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
    timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.teal, marginTop: 5 },
    timelineDotPending: { backgroundColor: '#e0b43c' },
    timelineBody: { flex: 1, gap: 2, paddingBottom: spacing.md },
    activityTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
    activityNote: { fontSize: 14, color: colors.ink },
    activityMeta: { fontSize: 12, color: colors.mutedink },
    // Quotation section
    quote: { gap: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
    quoteMrc: { fontSize: 16, fontWeight: '800', color: colors.ink },
    quoteTerms: { fontSize: 13, color: colors.mutedink },
    quoteNote: { fontSize: 13, color: colors.danger },
    formTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
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
    amountRow: { flexDirection: 'row', gap: spacing.sm },
    optLabel: { fontSize: 12, fontWeight: '700', color: colors.mutedink },
    netPreview: { fontSize: 14, fontWeight: '700', color: colors.teal },
    discountHint: { fontSize: 12, color: colors.warning, fontWeight: '600' },
});
