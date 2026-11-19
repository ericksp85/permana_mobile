import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError, apiFetch } from '../api/client';
import { Button, Card } from './ui';
import { colors, radius, spacing } from '../theme';
import type { LeadDetail, Quotation, Role } from '../types/api';

const STAGES: { value: string; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'follow', label: 'Follow-up' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'quote', label: 'Quotation' },
    { value: 'nego', label: 'Negotiation' },
];

// Must match App\Enums\LostReason on the server.
const LOST_REASONS = ['Price too high', 'Chose competitor', 'No coverage yet', 'Budget postponed'];

function messageOf(e: unknown, fallback: string): string {
    return e instanceof ApiError ? (e.firstError() ?? e.message) : fallback;
}

/** Run a destructive/side-effecting action after an explicit confirmation. */
function confirm(title: string, message: string, action: string, onConfirm: () => void) {
    Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: action, onPress: onConfirm },
    ]);
}

/**
 * Lead workflow: Admin Sales verification, stage moves, and Won / Lost.
 * Every action needs a connection (the server enforces the rules and returns
 * the new state), so it is blocked with a clear message while offline.
 */
export function LeadActions({
    lead,
    role,
    online,
    onChanged,
}: {
    lead: LeadDetail;
    role: Role | null | undefined;
    online: boolean;
    onChanged: () => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | undefined>();
    const [choosingLost, setChoosingLost] = useState(false);

    const closed = lead.stage === 'won' || lead.stage === 'lost';
    const needsVerification = role === 'admin_sales' && lead.verification_status === 'unverified';

    const run = async (fn: () => Promise<unknown>, fallback: string) => {
        if (!online) {
            setErr('You’re offline. Connect to the internet to do this.');
            return;
        }
        setBusy(true);
        setErr(undefined);
        try {
            await fn();
            setChoosingLost(false);
            await onChanged();
        } catch (e) {
            setErr(messageOf(e, fallback));
        } finally {
            setBusy(false);
        }
    };

    const verify = (action: 'verify' | 'reject') =>
        run(
            () => apiFetch(`/leads/${lead.id}/verification`, { method: 'POST', body: { action } }),
            'Couldn’t update verification.',
        );

    const moveStage = (stage: string) => {
        if (stage === lead.stage) return;
        return run(
            () => apiFetch(`/leads/${lead.id}/stage`, { method: 'PATCH', body: { stage } }),
            'Couldn’t change the stage.',
        );
    };

    const markWon = () =>
        run(() => apiFetch(`/leads/${lead.id}/win`, { method: 'POST' }), 'Couldn’t mark as won.');

    const markLost = (reason: string) =>
        run(
            () => apiFetch(`/leads/${lead.id}/lose`, { method: 'POST', body: { reason } }),
            'Couldn’t mark as lost.',
        );

    if (closed && !needsVerification) {
        return lead.stage === 'lost' && lead.lost_reason ? (
            <Card>
                <Text style={styles.title}>Lost</Text>
                <Text style={styles.body}>{lead.lost_reason}</Text>
            </Card>
        ) : null;
    }

    return (
        <Card style={{ gap: spacing.md }}>
            {needsVerification ? (
                <View style={{ gap: spacing.sm }}>
                    <Text style={styles.title}>Verify this lead</Text>
                    <Text style={styles.body}>
                        Check the company and contact data. Quotations can only be requested for verified leads.
                    </Text>
                    <Button
                        label="Verify lead"
                        loading={busy}
                        onPress={() =>
                            confirm('Verify lead', `Mark “${lead.company}” as verified?`, 'Verify', () => verify('verify'))
                        }
                    />
                    <Button
                        label="Reject as duplicate"
                        variant="ghost"
                        disabled={busy}
                        onPress={() =>
                            confirm(
                                'Reject lead',
                                'This closes the lead as a duplicate. It cannot be undone.',
                                'Reject',
                                () => verify('reject'),
                            )
                        }
                    />
                </View>
            ) : null}

            {!closed ? (
                <>
                    <View style={{ gap: spacing.xs }}>
                        <Text style={styles.title}>Stage</Text>
                        <View style={styles.chips}>
                            {STAGES.map((s) => {
                                const active = s.value === lead.stage;
                                return (
                                    <Pressable
                                        key={s.value}
                                        onPress={() => moveStage(s.value)}
                                        disabled={busy}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Move to ${s.label}`}
                                        accessibilityState={{ selected: active, disabled: busy }}
                                        style={[styles.chip, active && styles.chipOn]}
                                    >
                                        <Text style={[styles.chipText, active && styles.chipTextOn]}>{s.label}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    <View style={{ gap: spacing.sm }}>
                        <Button
                            label="Mark as won"
                            loading={busy}
                            onPress={() =>
                                confirm(
                                    'Mark as won',
                                    `Close “${lead.company}” as won? Its MRC is booked to the target.`,
                                    'Mark won',
                                    markWon,
                                )
                            }
                        />
                        {choosingLost ? (
                            <View style={{ gap: spacing.xs }}>
                                <Text style={styles.title}>Why was it lost?</Text>
                                <View style={styles.chips}>
                                    {LOST_REASONS.map((r) => (
                                        <Pressable
                                            key={r}
                                            disabled={busy}
                                            onPress={() =>
                                                confirm('Mark as lost', `Reason: ${r}`, 'Mark lost', () => markLost(r))
                                            }
                                            accessibilityRole="button"
                                            style={styles.chip}
                                        >
                                            <Text style={styles.chipText}>{r}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                                <Button label="Cancel" variant="ghost" onPress={() => setChoosingLost(false)} />
                            </View>
                        ) : (
                            <Button
                                label="Mark as lost"
                                variant="ghost"
                                disabled={busy}
                                onPress={() => setChoosingLost(true)}
                            />
                        )}
                    </View>
                </>
            ) : null}

            {err ? (
                <Text style={styles.err} accessibilityRole="alert">
                    {err}
                </Text>
            ) : null}
        </Card>
    );
}

/**
 * Quotation review for the approval chain:
 *   Admin Sales: verify or return to the AM · GM Sales: approve or reject.
 */
export function QuotationReview({
    quotation,
    role,
    online,
    onChanged,
}: {
    quotation: Quotation;
    role: Role | null | undefined;
    online: boolean;
    onChanged: () => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | undefined>();
    const [note, setNote] = useState('');
    const [needNote, setNeedNote] = useState<'return' | 'reject' | null>(null);

    const adminTurn = role === 'admin_sales' && quotation.status === 'verifying';
    const gmTurn = role === 'gm_sales' && quotation.status === 'waiting_gm';
    if (!adminTurn && !gmTurn) return null;

    const call = async (path: string, body?: unknown) => {
        if (!online) {
            setErr('You’re offline. Connect to the internet to do this.');
            return;
        }
        setBusy(true);
        setErr(undefined);
        try {
            await apiFetch(`/quotations/${quotation.id}/${path}`, { method: 'POST', body });
            setNote('');
            setNeedNote(null);
            await onChanged();
        } catch (e) {
            setErr(messageOf(e, 'Couldn’t update the quotation.'));
        } finally {
            setBusy(false);
        }
    };

    const submitNote = () => {
        if (!note.trim()) {
            setErr('A note is required.');
            return;
        }
        return call(needNote === 'return' ? 'return' : 'reject', { note: note.trim() });
    };

    return (
        <View style={{ gap: spacing.sm }}>
            {needNote ? (
                <>
                    <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder={needNote === 'return' ? 'What should the AM fix?' : 'Reason for rejecting'}
                        accessibilityLabel="Note"
                        placeholderTextColor={colors.mutedink}
                        multiline
                        style={styles.noteInput}
                    />
                    <Button label={needNote === 'return' ? 'Return to AM' : 'Reject'} onPress={submitNote} loading={busy} />
                    <Button label="Cancel" variant="ghost" onPress={() => { setNeedNote(null); setErr(undefined); }} />
                </>
            ) : adminTurn ? (
                <>
                    <Button label="Verify & send to GM" loading={busy} onPress={() => call('verify')} />
                    <Button label="Return to AM" variant="ghost" disabled={busy} onPress={() => setNeedNote('return')} />
                </>
            ) : (
                <>
                    <Button
                        label="Approve quotation"
                        loading={busy}
                        onPress={() =>
                            confirm('Approve quotation', 'Approve this quotation so the AM can send it?', 'Approve', () => call('approve'))
                        }
                    />
                    <Button label="Reject" variant="ghost" disabled={busy} onPress={() => setNeedNote('reject')} />
                </>
            )}
            {err ? (
                <Text style={styles.err} accessibilityRole="alert">
                    {err}
                </Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 13, fontWeight: '800', color: colors.mutedink, textTransform: 'uppercase' },
    body: { fontSize: 14, color: colors.ink },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: '#fff',
    },
    chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.ink },
    chipTextOn: { color: '#fff' },
    err: { color: colors.danger, fontSize: 13 },
    noteInput: {
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radius.btn,
        backgroundColor: '#fff',
        padding: spacing.md,
        minHeight: 72,
        textAlignVertical: 'top',
        color: colors.ink,
    },
});
