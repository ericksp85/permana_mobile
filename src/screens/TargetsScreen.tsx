import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../api/client';
import { Card, rupiahShort } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import type { TargetPerson, TargetsResponse, TargetTeam } from '../types/api';

function Bar({ pct }: { pct: number }) {
    return (
        <View style={styles.track}>
            <View
                style={[
                    styles.fill,
                    { width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? colors.success : colors.teal },
                ]}
            />
        </View>
    );
}

export default function TargetsScreen() {
    const [data, setData] = useState<TargetsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch<TargetsResponse>('/targets');
            setData(res);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.navy} />
            </View>
        );
    }

    if (!data) {
        return (
            <View style={styles.center}>
                <Text style={styles.empty}>Couldn’t load targets.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            {data.me ? (
                <Card style={{ gap: spacing.md }}>
                    <Text style={styles.cardTitle}>My target · this month</Text>
                    <View style={styles.meTop}>
                        <Text style={styles.meWon}>{rupiahShort(data.me.won)}</Text>
                        <Text style={styles.meTarget}>/ {rupiahShort(data.me.mrc_target)}</Text>
                        <Text style={styles.mePct}>{data.me.pct}%</Text>
                    </View>
                    <Bar pct={data.me.pct} />
                    <View style={styles.annualRow}>
                        <Text style={styles.annualLabel}>Annual target {new Date().getFullYear()}</Text>
                        <Text style={styles.annualVal}>
                            {rupiahShort(data.me.annual_won)} / {rupiahShort(data.me.annual_target)}
                        </Text>
                    </View>
                </Card>
            ) : null}

            {data.teams.length === 0 ? (
                <Text style={styles.footnote}>Targets are set by your Sales Manager.</Text>
            ) : null}

            {data.teams.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                    <Text style={styles.sectionTitle}>Team</Text>
                    {data.teams.map((t) => (
                        <TeamCard key={t.id} team={t} />
                    ))}
                </View>
            ) : null}

            {data.people.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                    <Text style={styles.sectionTitle}>Account Manager</Text>
                    {data.people.map((p) => (
                        <PersonCard key={p.id} person={p} />
                    ))}
                </View>
            ) : null}
        </ScrollView>
    );
}

function TeamCard({ team }: { team: TargetTeam }) {
    return (
        <Card style={{ gap: spacing.sm }}>
            <View style={styles.rowBetween}>
                <Text style={styles.name}>{team.name}</Text>
                <Text style={styles.pct}>{team.pct}%</Text>
            </View>
            <Bar pct={team.pct} />
            <View style={styles.rowBetween}>
                <Text style={styles.sub}>
                    {rupiahShort(team.won)} / {rupiahShort(team.mrc_target)}
                </Text>
                <Text style={styles.sub}>{team.members} AMs</Text>
            </View>
            {team.under_sum ? (
                <Text style={styles.warn}>AM targets exceed the team target</Text>
            ) : null}
        </Card>
    );
}

function PersonCard({ person }: { person: TargetPerson }) {
    return (
        <Card style={{ gap: spacing.sm }}>
            <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{person.name}</Text>
                    {person.team ? <Text style={styles.sub}>{person.team}</Text> : null}
                </View>
                <Text style={styles.pct}>{person.pct}%</Text>
            </View>
            <Bar pct={person.pct} />
            <Text style={styles.sub}>
                {rupiahShort(person.won)} / {rupiahShort(person.mrc_target)}
            </Text>
        </Card>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.softbg },
    content: { padding: spacing.lg, gap: spacing.lg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softbg },
    cardTitle: { fontSize: 13, fontWeight: '800', color: colors.mutedink, textTransform: 'uppercase' },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.mutedink, textTransform: 'uppercase' },
    meTop: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
    meWon: { fontSize: 24, fontWeight: '800', color: colors.ink },
    meTarget: { fontSize: 15, fontWeight: '700', color: colors.mutedink, flex: 1 },
    mePct: { fontSize: 18, fontWeight: '800', color: colors.teal },
    track: { height: 10, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
    fill: { height: 10, borderRadius: radius.pill },
    annualRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    annualLabel: { fontSize: 13, fontWeight: '700', color: colors.mutedink },
    annualVal: { fontSize: 13, fontWeight: '700', color: colors.ink },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    name: { fontSize: 15, fontWeight: '700', color: colors.ink },
    pct: { fontSize: 16, fontWeight: '800', color: colors.teal },
    sub: { fontSize: 13, color: colors.mutedink },
    warn: { fontSize: 12, color: colors.warning, fontWeight: '600' },
    footnote: { fontSize: 13, color: colors.mutedink, textAlign: 'center' },
    empty: { color: colors.mutedink },
});
