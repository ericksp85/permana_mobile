import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, rupiahShort } from '../components/ui';
import type { HomeStackScreenProps } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { NotificationsResponse, TargetSummary, TargetsResponse } from '../types/api';

const MENU: {
    key: 'Reports' | 'Targets' | 'Quotations';
    label: string;
    sub: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
    { key: 'Reports', label: 'Laporan', sub: 'KPI, tren, funnel, peringkat', icon: 'bar-chart' },
    { key: 'Targets', label: 'Target', sub: 'Pencapaian tim & personal', icon: 'flag' },
    { key: 'Quotations', label: 'Penawaran', sub: 'Status quotation', icon: 'document-text' },
];

function ProgressBar({ pct }: { pct: number }) {
    return (
        <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, pct)}%` }]} />
        </View>
    );
}

export default function HomeScreen({ navigation }: HomeStackScreenProps<'HomeMain'>) {
    const { user, signOut } = useAuth();
    const [summary, setSummary] = useState<TargetSummary | null>(null);
    const [unread, setUnread] = useState(0);

    const load = useCallback(async () => {
        try {
            const [targets, notifs] = await Promise.all([
                apiFetch<TargetsResponse>('/targets'),
                apiFetch<NotificationsResponse>('/notifications', { query: { per_page: 1 } }),
            ]);
            setSummary(targets.me);
            setUnread(notifs.unread);
        } catch {
            // Dashboard is best-effort; leave prior values on a transient error.
        }
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', load);
        return unsubscribe;
    }, [navigation, load]);

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.heroRow}>
                    <View style={styles.hero}>
                        <Text style={styles.hello}>Halo,</Text>
                        <Text style={styles.name}>{user?.name}</Text>
                        <Text style={styles.role}>
                            {user?.role_label}
                            {user?.team ? ` · ${user.team}` : ''}
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => navigation.navigate('Notifications')}
                        style={styles.bell}
                        hitSlop={8}
                    >
                        <Ionicons name="notifications-outline" size={24} color={colors.ink} />
                        {unread > 0 ? (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                            </View>
                        ) : null}
                    </Pressable>
                </View>

                {summary ? (
                    <Card style={{ gap: spacing.md }}>
                        <Text style={styles.cardTitle}>Target bulan ini</Text>
                        <View style={styles.targetTop}>
                            <Text style={styles.won}>{rupiahShort(summary.won)}</Text>
                            <Text style={styles.target}>/ {rupiahShort(summary.mrc_target)}</Text>
                            <Text style={styles.pct}>{summary.pct}%</Text>
                        </View>
                        <ProgressBar pct={summary.pct} />
                        <View style={styles.annualRow}>
                            <Text style={styles.annualLabel}>Tahunan</Text>
                            <Text style={styles.annualVal}>
                                {rupiahShort(summary.annual_won)} / {rupiahShort(summary.annual_target)}
                            </Text>
                        </View>
                    </Card>
                ) : null}

                <View style={{ gap: spacing.sm }}>
                    {MENU.map((item) => (
                        <Pressable
                            key={item.key}
                            onPress={() => navigation.navigate(item.key)}
                            style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
                        >
                            <Card style={styles.menuRow}>
                                <View style={styles.menuIcon}>
                                    <Ionicons name={item.icon} size={20} color={colors.navy} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                    <Text style={styles.menuSub}>{item.sub}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.mutedink} />
                            </Card>
                        </Pressable>
                    ))}
                </View>

                <Button label="Keluar" variant="ghost" onPress={signOut} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.softbg },
    container: { padding: spacing.lg, gap: spacing.lg },
    heroRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    hero: { gap: 2, flex: 1 },
    hello: { fontSize: 15, color: colors.mutedink },
    name: { fontSize: 26, fontWeight: '800', color: colors.ink },
    role: { fontSize: 14, color: colors.blue, fontWeight: '600' },
    bell: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.line,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        backgroundColor: colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
    cardTitle: { fontSize: 13, fontWeight: '800', color: colors.mutedink, textTransform: 'uppercase' },
    targetTop: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
    won: { fontSize: 24, fontWeight: '800', color: colors.ink },
    target: { fontSize: 15, fontWeight: '700', color: colors.mutedink, flex: 1 },
    pct: { fontSize: 18, fontWeight: '800', color: colors.teal },
    track: { height: 10, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
    fill: { height: 10, borderRadius: radius.pill, backgroundColor: colors.teal },
    annualRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    annualLabel: { fontSize: 13, fontWeight: '700', color: colors.mutedink },
    annualVal: { fontSize: 13, fontWeight: '700', color: colors.ink },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: radius.btn,
        backgroundColor: colors.softbg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
    menuSub: { fontSize: 12, color: colors.mutedink },
});
