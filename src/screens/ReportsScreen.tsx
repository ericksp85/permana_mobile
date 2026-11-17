import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../api/client';
import { Card, rupiahShort } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import type {
    LeaderboardResponse,
    LeaderboardRow,
    ReportsResponse,
} from '../types/api';

type Period = 'monthly' | 'weekly';
type Scope = 'team' | 'all';

function Toggle<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <View style={styles.toggle}>
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <Pressable
                        key={o.value}
                        onPress={() => onChange(o.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[styles.toggleBtn, active && styles.toggleBtnActive]}
                    >
                        <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                            {o.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

export default function ReportsScreen() {
    const [period, setPeriod] = useState<Period>('monthly');
    const [scope, setScope] = useState<Scope>('team');
    const [report, setReport] = useState<ReportsResponse | null>(null);
    const [board, setBoard] = useState<LeaderboardResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const loadReport = useCallback(async (p: Period) => {
        try {
            const res = await apiFetch<ReportsResponse>('/reports', { query: { period: p } });
            setReport(res);
        } catch {
            setReport(null);
        }
    }, []);

    const loadBoard = useCallback(async (s: Scope) => {
        try {
            const res = await apiFetch<LeaderboardResponse>('/reports/leaderboard', {
                query: { scope: s },
            });
            setBoard(res);
        } catch {
            setBoard(null);
        }
    }, []);

    useEffect(() => {
        loadReport(period);
    }, [period, loadReport]);

    useEffect(() => {
        loadBoard(scope);
    }, [scope, loadBoard]);

    useEffect(() => {
        Promise.all([loadReport('monthly'), loadBoard('team')]).finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.navy} />
            </View>
        );
    }

    const maxMrc = report ? Math.max(1, ...report.series.map((s) => s.mrc)) : 1;
    const maxFunnel = report ? Math.max(1, ...report.funnel.map((f) => f.value)) : 1;

    return (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.screen} contentContainerStyle={styles.content}>
            <Toggle
                options={[
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'weekly', label: 'Weekly' },
                ]}
                value={period}
                onChange={setPeriod}
            />

            {report ? (
                <>
                    <View style={styles.kpiGrid}>
                        <Kpi label="Won MRC" value={rupiahShort(report.kpis.won_mrc)} accent />
                        <Kpi label="New customers" value={String(report.kpis.new_customers)} />
                        <Kpi label="Pipeline added" value={rupiahShort(report.kpis.pipeline_added)} />
                        <Kpi label="Activities" value={String(report.kpis.activities)} />
                    </View>

                    <Card style={{ gap: spacing.md }}>
                        <Text style={styles.cardTitle}>Won MRC</Text>
                        <View style={styles.bars}>
                            {report.series.map((s, i) => (
                                <View key={i} style={styles.barCol}>
                                    <View style={styles.barArea}>
                                        <View
                                            style={[
                                                styles.bar,
                                                {
                                                    height: `${(s.mrc / maxMrc) * 100}%`,
                                                    backgroundColor: s.current ? colors.teal : colors.line,
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.barLabel}>{s.label}</Text>
                                </View>
                            ))}
                        </View>
                    </Card>

                    <Card style={{ gap: spacing.sm }}>
                        <Text style={styles.cardTitle}>Prospect funnel · this month</Text>
                        {report.funnel.map((f) => (
                            <View key={f.key} style={styles.funnelRow}>
                                <Text style={styles.funnelLabel}>{f.label}</Text>
                                <View style={styles.funnelTrack}>
                                    <View
                                        style={[
                                            styles.funnelFill,
                                            { width: `${(f.value / maxFunnel) * 100}%` },
                                        ]}
                                    />
                                </View>
                                <Text style={styles.funnelValue}>{f.value}</Text>
                            </View>
                        ))}
                    </Card>
                </>
            ) : null}

            <View style={styles.boardHeader}>
                <Text style={styles.cardTitle}>Leaderboard {board ? `· ${board.month}` : ''}</Text>
                <Toggle
                    options={[
                        { value: 'team', label: 'Team' },
                        { value: 'all', label: 'All' },
                    ]}
                    value={scope}
                    onChange={setScope}
                />
            </View>
            {board && board.rows.length > 0 ? (
                board.rows.map((row, i) => <BoardRow key={row.user_id} row={row} rank={i + 1} />)
            ) : (
                <Text style={styles.empty}>No leaderboard data yet.</Text>
            )}
        </ScrollView>
    );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <Card style={styles.kpi}>
            <Text style={[styles.kpiValue, accent && { color: colors.teal }]}>{value}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
        </Card>
    );
}

function BoardRow({ row, rank }: { row: LeaderboardRow; rank: number }) {
    return (
        <Card style={styles.boardRow}>
            <Text style={[styles.rank, rank <= 3 && { color: colors.teal }]}>{rank}</Text>
            <View style={{ flex: 1 }}>
                <Text style={styles.boardName} numberOfLines={1}>
                    {row.name}
                </Text>
                {row.team ? <Text style={styles.boardTeam}>{row.team}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.boardMrc}>{rupiahShort(row.won_mrc)}</Text>
                <Text style={styles.boardDeals}>{row.deals} deals</Text>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.softbg },
    content: { padding: spacing.lg, gap: spacing.lg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softbg },
    toggle: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.line,
        padding: 3,
    },
    toggleBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.pill, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: colors.navy },
    toggleText: { fontSize: 13, fontWeight: '700', color: colors.mutedink },
    toggleTextActive: { color: colors.white },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    kpi: { width: '47%', flexGrow: 1, gap: 4 },
    kpiValue: { fontSize: 20, fontWeight: '800', color: colors.ink },
    kpiLabel: { fontSize: 12, fontWeight: '600', color: colors.mutedink },
    cardTitle: { fontSize: 13, fontWeight: '800', color: colors.mutedink, textTransform: 'uppercase' },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, height: 120 },
    barCol: { flex: 1, alignItems: 'center', gap: spacing.xs },
    barArea: { height: 96, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
    bar: { width: '70%', borderRadius: 6, minHeight: 3 },
    barLabel: { fontSize: 10, color: colors.mutedink },
    funnelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    funnelLabel: { width: 78, fontSize: 12, color: colors.ink },
    funnelTrack: { flex: 1, height: 18, borderRadius: 6, backgroundColor: colors.line, overflow: 'hidden' },
    funnelFill: { height: 18, borderRadius: 6, backgroundColor: colors.blue, minWidth: 4 },
    funnelValue: { width: 28, textAlign: 'right', fontSize: 13, fontWeight: '700', color: colors.ink },
    boardHeader: { gap: spacing.sm },
    boardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rank: { width: 24, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.mutedink },
    boardName: { fontSize: 15, fontWeight: '700', color: colors.ink },
    boardTeam: { fontSize: 12, color: colors.mutedink },
    boardMrc: { fontSize: 15, fontWeight: '800', color: colors.teal },
    boardDeals: { fontSize: 12, color: colors.mutedink },
    empty: { textAlign: 'center', color: colors.mutedink, paddingVertical: spacing.lg },
});
