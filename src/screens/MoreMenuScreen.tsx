import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { canCanvass } from '../auth/roles';
import { Card } from '../components/ui';
import type { MoreStackParamList, MoreStackScreenProps } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { NotificationsResponse, TargetsResponse } from '../types/api';

/** Every menu target is a paramless screen in the More stack. */
type MenuRoute = Exclude<keyof MoreStackParamList, 'MoreMenu' | 'CanvassArea'>;

type Item = {
    label: string;
    sub: string;
    icon: keyof typeof Ionicons.glyphMap;
    route: MenuRoute;
};

function monthName(): string {
    return new Date().toLocaleDateString('en-US', { month: 'long' });
}

export default function MoreMenuScreen({ navigation }: MoreStackScreenProps<'MoreMenu'>) {
    const { user, signOut } = useAuth();
    const [unread, setUnread] = useState(0);
    const [pct, setPct] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            const [notifs, targets] = await Promise.all([
                apiFetch<NotificationsResponse>('/notifications', { query: { per_page: 1 } }),
                apiFetch<TargetsResponse>('/targets'),
            ]);
            setUnread(notifs.unread);
            setPct(targets.me?.pct ?? null);
        } catch {
            // Subtitles are best-effort; the menu still works without them.
        }
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', load);
        return unsubscribe;
    }, [navigation, load]);

    const items: Item[] = [
        {
            label: 'Notifications',
            sub: unread > 0 ? `${unread} unread` : 'All read',
            icon: 'notifications-outline',
            route: 'Notifications',
        },
        { label: 'Attendance', sub: 'Check-in & history', icon: 'finger-print-outline', route: 'Attendance' },
        ...(canCanvass(user)
            ? [{ label: 'Canvassing', sub: 'Areas & visits', icon: 'map-outline' as const, route: 'CanvassList' as const }]
            : []),
        { label: 'Quotations', sub: 'Status & approvals', icon: 'document-text-outline', route: 'Quotations' },
        {
            label: 'Targets & reports',
            sub: pct !== null ? `${pct}% of ${monthName()}` : 'KPIs & funnel',
            icon: 'bar-chart-outline',
            route: 'Reports',
        },
        {
            label: 'Leaderboard',
            sub: 'Garuda · Elang · Partnership',
            icon: 'trophy-outline',
            route: 'Reports',
        },
        { label: 'Products', sub: 'DIA · Hosta · iMore', icon: 'cube-outline', route: 'Products' },
    ];

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>More</Text>

                <View style={styles.profile}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(user?.name ?? '?').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name} numberOfLines={1}>
                            {user?.name}
                        </Text>
                        <Text style={styles.role} numberOfLines={1}>
                            {user?.role_label}
                            {user?.team ? ` · ${user.team}` : ''}
                        </Text>
                    </View>
                </View>

                <View style={styles.list}>
                    {items.map((item) => (
                        <Pressable
                            key={item.label}
                            onPress={() => navigation.navigate(item.route as never)}
                            accessibilityRole="button"
                            style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
                        >
                            <Card style={styles.row}>
                                <View style={styles.rowIcon}>
                                    <Ionicons name={item.icon} size={20} color={colors.navy} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowLabel}>{item.label}</Text>
                                    <Text style={styles.rowSub}>{item.sub}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.mutedink} />
                            </Card>
                        </Pressable>
                    ))}
                </View>

                <Pressable
                    onPress={signOut}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.7 }]}
                >
                    <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                    <Text style={styles.signOutText}>Sign out</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.softbg },
    container: { padding: spacing.lg, gap: spacing.lg },
    title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: colors.ink },
    profile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.navy,
        borderRadius: radius.card,
        padding: spacing.lg,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.teal,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: 20, fontWeight: '800', color: colors.white },
    name: { fontSize: 17, fontWeight: '800', color: colors.white },
    role: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    list: { gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rowIcon: {
        width: 40,
        height: 40,
        borderRadius: radius.btn,
        backgroundColor: colors.softbg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowLabel: { fontSize: 15, fontWeight: '700', color: colors.ink },
    rowSub: { fontSize: 12, color: colors.mutedink },
    signOut: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        height: 50,
        borderRadius: radius.btn,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.white,
    },
    signOutText: { fontSize: 14, fontWeight: '700', color: colors.danger },
});
