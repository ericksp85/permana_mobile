import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { canCanvass } from '../auth/roles';
import { Card, ProgressRing, StagePill, rupiahShort } from '../components/ui';
import type { HomeStackScreenProps } from '../navigation/types';
import SyncBanner from '../offline/SyncBanner';
import { colors, radius, spacing } from '../theme';
import type {
    Event,
    Lead,
    NotificationsResponse,
    Paginated,
    TargetSummary,
    TargetsResponse,
} from '../types/api';

type QuickAction = {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    bg: string;
    fg: string;
    onPress: () => void;
};

/** Open leads still in play, newest activity first — the "follow-ups due" feed. */
const OPEN_STAGES = new Set(['new', 'follow', 'meeting', 'quote', 'nego']);

function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning,';
    if (h < 18) return 'Good afternoon,';
    return 'Good evening,';
}

function todayLabel(): string {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

export default function HomeScreen({ navigation }: HomeStackScreenProps<'HomeMain'>) {
    const { user } = useAuth();
    const [summary, setSummary] = useState<TargetSummary | null>(null);
    const [unread, setUnread] = useState(0);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [events, setEvents] = useState<Event[]>([]);

    const parent = navigation.getParent();

    const load = useCallback(async () => {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const [targets, notifs, leadRes, eventRes] = await Promise.all([
                apiFetch<TargetsResponse>('/targets'),
                apiFetch<NotificationsResponse>('/notifications', { query: { per_page: 1 } }),
                apiFetch<Paginated<Lead>>('/leads', { query: { per_page: 50 } }),
                apiFetch<Paginated<Event>>('/events', { query: { from: today, per_page: 50 } }),
            ]);
            setSummary(targets.me);
            setUnread(notifs.unread);
            setLeads(leadRes.data);
            setEvents(eventRes.data);
        } catch {
            // Dashboard is best-effort; keep prior values on a transient error.
        }
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', load);
        return unsubscribe;
    }, [navigation, load]);

    const mine = leads.filter((l) => l.owner_id === user?.id);
    const followUps = mine
        .filter((l) => OPEN_STAGES.has(l.stage))
        .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
        .slice(0, 3);
    const openCount = mine.filter((l) => OPEN_STAGES.has(l.stage)).length;
    const openMrc = mine
        .filter((l) => OPEN_STAGES.has(l.stage))
        .reduce((sum, l) => sum + (l.est_mrc ?? 0), 0);

    const todayStart = new Date().toISOString().slice(0, 10);
    const todayEvents = events.filter((e) => e.starts_at.slice(0, 10) === todayStart).slice(0, 3);

    const toGo = summary ? Math.max(0, summary.mrc_target - summary.won) : 0;

    const openLead = (lead: Lead) =>
        parent?.navigate('Pipeline', {
            screen: 'LeadDetail',
            params: { leadId: lead.id, company: lead.company },
        });

    const quickActions: QuickAction[] = [
        { label: 'New lead', icon: 'add-outline', bg: '#ddf5f6', fg: '#00737a', onPress: () => parent?.navigate('Pipeline') },
        { label: 'Log activity', icon: 'create-outline', bg: '#e9edfb', fg: '#3a52a8', onPress: () => parent?.navigate('Pipeline') },
        { label: 'Check-in', icon: 'finger-print-outline', bg: '#dff3e8', fg: '#137347', onPress: () => parent?.navigate('More', { screen: 'Attendance' }) },
        ...(canCanvass(user)
            ? [{ label: 'Canvass', icon: 'map-outline' as const, bg: '#fff2d6', fg: '#8a5e00', onPress: () => parent?.navigate('More', { screen: 'CanvassList' }) }]
            : []),
    ];

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Navy header with greeting, notifications and the target donut */}
                <View style={styles.hero}>
                    <View style={styles.heroTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.hello}>{greeting()}</Text>
                            <Text style={styles.name} numberOfLines={1}>
                                {user?.name}
                            </Text>
                            <Text style={styles.role}>
                                {user?.role_label}
                                {user?.team ? ` · ${user.team}` : ''}
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => parent?.navigate('More', { screen: 'Notifications' })}
                            style={styles.bell}
                            hitSlop={8}
                        >
                            <Ionicons name="notifications-outline" size={22} color={colors.white} />
                            {unread > 0 ? (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                                </View>
                            ) : null}
                        </Pressable>
                    </View>

                    <View style={styles.heroTarget}>
                        <ProgressRing pct={summary?.pct ?? 0} label="to go" />
                        <View style={{ flex: 1, gap: 2 }}>
                            <Text style={styles.toGo}>{rupiahShort(toGo)}</Text>
                            <Text style={styles.toGoCaption}>of MRC · to go</Text>
                            <Text style={styles.heroWon}>
                                {rupiahShort(summary?.won)} / {rupiahShort(summary?.mrc_target)}
                            </Text>
                            <Pressable onPress={() => parent?.navigate('More', { screen: 'Reports' })} hitSlop={6}>
                                <Text style={styles.heroLink}>Targets &amp; reports →</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Quick actions */}
                <View style={styles.actions}>
                    {quickActions.map((a) => (
                        <Pressable
                            key={a.label}
                            onPress={a.onPress}
                            style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
                                <Ionicons name={a.icon} size={24} color={a.fg} />
                            </View>
                            <Text style={styles.actionLabel}>{a.label}</Text>
                        </Pressable>
                    ))}
                </View>

                <SyncBanner />

                {/* Today */}
                <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>Today · {todayLabel()}</Text>
                    <Pressable onPress={() => parent?.navigate('Schedule')} hitSlop={6}>
                        <Text style={styles.link}>Schedule →</Text>
                    </Pressable>
                </View>
                <Card style={{ gap: spacing.sm }}>
                    {todayEvents.length === 0 ? (
                        <>
                            <Text style={styles.emptyTitle}>Free day</Text>
                            <Text style={styles.emptySub}>
                                {canCanvass(user)
                                    ? 'Plan a canvassing route or book a meeting.'
                                    : 'Nothing scheduled today.'}
                            </Text>
                        </>
                    ) : (
                        todayEvents.map((e) => (
                            <View key={e.id} style={styles.eventRow}>
                                <Text style={styles.eventTime}>
                                    {new Date(e.starts_at).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.eventTitle} numberOfLines={1}>
                                        {e.title}
                                    </Text>
                                    {e.location ? (
                                        <Text style={styles.eventLoc} numberOfLines={1}>
                                            {e.location}
                                        </Text>
                                    ) : null}
                                </View>
                                <Text style={styles.eventType}>{e.type_label}</Text>
                            </View>
                        ))
                    )}
                </Card>

                {/* Follow-ups due */}
                <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>Follow-ups due</Text>
                    <Pressable onPress={() => parent?.navigate('Pipeline')} hitSlop={6}>
                        <Text style={styles.link}>Pipeline →</Text>
                    </Pressable>
                </View>
                <Card style={{ gap: spacing.sm }}>
                    {followUps.length === 0 ? (
                        <>
                            <Text style={styles.emptyTitle}>Nothing due</Text>
                            <Text style={styles.emptySub}>You&apos;re all caught up on follow-ups.</Text>
                        </>
                    ) : (
                        followUps.map((l) => (
                            <Pressable
                                key={l.id}
                                onPress={() => openLead(l)}
                                style={({ pressed }) => [styles.leadRow, pressed && { opacity: 0.6 }]}
                            >
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Text style={styles.leadCompany} numberOfLines={1}>
                                        {l.company}
                                    </Text>
                                    <Text style={styles.leadNext} numberOfLines={1}>
                                        {l.next_step ?? 'No next step set'}
                                    </Text>
                                </View>
                                <StagePill stage={l.stage} label={l.stage_label} />
                            </Pressable>
                        ))
                    )}
                </Card>

                {/* My pipeline */}
                <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>My pipeline</Text>
                    <Pressable onPress={() => parent?.navigate('More', { screen: 'Reports' })} hitSlop={6}>
                        <Text style={styles.link}>Rank →</Text>
                    </Pressable>
                </View>
                <Card style={styles.pipeCard}>
                    <View style={styles.pipeCol}>
                        <Text style={styles.pipeValue}>{openCount}</Text>
                        <Text style={styles.pipeLabel}>Open leads</Text>
                    </View>
                    <View style={styles.pipeDivider} />
                    <View style={styles.pipeCol}>
                        <Text style={styles.pipeValue}>{rupiahShort(openMrc)}</Text>
                        <Text style={styles.pipeLabel}>Weighted MRC</Text>
                    </View>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.softbg },
    container: { padding: spacing.lg, gap: spacing.lg },
    hero: {
        backgroundColor: colors.navy,
        borderRadius: radius.card,
        padding: spacing.lg,
        gap: spacing.lg,
    },
    heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
    hello: { fontSize: 15, fontWeight: '800', color: colors.teal },
    name: { fontSize: 24, fontWeight: '800', color: colors.white, marginTop: 2 },
    role: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 2 },
    bell: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: 3,
        right: 3,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        backgroundColor: colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
    heroTarget: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    toGo: { fontSize: 22, fontWeight: '800', color: colors.white },
    toGoCaption: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
    heroWon: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginTop: 4 },
    heroLink: { fontSize: 13, fontWeight: '700', color: colors.teal, marginTop: 6 },
    actions: { flexDirection: 'row', gap: spacing.sm },
    action: { flex: 1, alignItems: 'center', gap: spacing.sm },
    actionIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: { fontSize: 12, fontWeight: '600', color: colors.ink, textAlign: 'center' },
    sectionHead: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginTop: spacing.xs,
    },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
    link: { fontSize: 13, fontWeight: '700', color: colors.blue },
    emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
    emptySub: { fontSize: 13, color: colors.mutedink },
    eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    eventTime: { fontSize: 13, fontWeight: '800', color: colors.navy, width: 64 },
    eventTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
    eventLoc: { fontSize: 12, color: colors.mutedink },
    eventType: { fontSize: 11, fontWeight: '700', color: colors.mutedink, textTransform: 'uppercase' },
    leadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    leadCompany: { fontSize: 14, fontWeight: '700', color: colors.ink },
    leadNext: { fontSize: 12, color: colors.mutedink },
    pipeCard: { flexDirection: 'row', alignItems: 'center' },
    pipeCol: { flex: 1, alignItems: 'center', gap: 2 },
    pipeValue: { fontSize: 22, fontWeight: '800', color: colors.ink },
    pipeLabel: { fontSize: 12, fontWeight: '600', color: colors.mutedink },
    pipeDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.line, marginVertical: spacing.xs },
});
