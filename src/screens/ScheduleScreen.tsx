import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    SectionList,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch, ApiError } from '../api/client';
import { Button, Card, Pill } from '../components/ui';
import { colors, spacing } from '../theme';
import type { Event, Paginated } from '../types/api';

function dateKey(iso: string): string {
    return new Date(iso).toISOString().slice(0, 10);
}

function sectionTitle(key: string): string {
    const today = new Date().toISOString().slice(0, 10);
    if (key === today) return 'Hari ini';
    return new Date(key + 'T00:00:00').toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

function timeOf(iso: string): string {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function ScheduleScreen() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [busyId, setBusyId] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            setError(undefined);
            const from = new Date().toISOString().slice(0, 10);
            const res = await apiFetch<Paginated<Event>>('/events', {
                query: { from, per_page: 100 },
            });
            setEvents(res.data);
        } catch {
            setError('Gagal memuat jadwal.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const markDone = async (event: Event) => {
        setBusyId(event.id);
        try {
            await apiFetch(`/events/${event.id}/done`, { method: 'POST' });
            await load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Gagal menandai selesai.');
        } finally {
            setBusyId(null);
        }
    };

    const sections = useMemo(() => {
        const groups = new Map<string, Event[]>();
        for (const event of events) {
            const key = dateKey(event.starts_at);
            const list = groups.get(key) ?? [];
            list.push(event);
            groups.set(key, list);
        }
        return Array.from(groups.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, data]) => ({ title: sectionTitle(key), data }));
    }, [events]);

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator color={colors.navy} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Jadwal</Text>
                <Text style={styles.count}>{events.length} agenda</Text>
            </View>
            <SectionList
                sections={sections}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.list}
                stickySectionHeadersEnabled={false}
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
                renderSectionHeader={({ section }) => (
                    <Text style={styles.sectionHeader}>{section.title}</Text>
                )}
                ListEmptyComponent={
                    <Text style={styles.empty}>{error ?? 'Tidak ada agenda mendatang.'}</Text>
                }
                renderItem={({ item }) => {
                    const done = item.status === 'done';
                    return (
                        <Card style={styles.eventCard}>
                            <View style={styles.eventTop}>
                                <Text style={styles.time}>{timeOf(item.starts_at)}</Text>
                                {done ? (
                                    <Pill bg="#dff3e8" fg="#137347">
                                        Selesai
                                    </Pill>
                                ) : (
                                    <Pill bg="#e8eff4" fg="#2c5d78">
                                        {item.type_label}
                                    </Pill>
                                )}
                            </View>
                            <Text style={styles.eventTitle}>{item.title}</Text>
                            {item.location ? (
                                <Text style={styles.location}>{item.location}</Text>
                            ) : null}
                            {!done ? (
                                <Button
                                    label="Tandai selesai"
                                    variant="ghost"
                                    loading={busyId === item.id}
                                    onPress={() => markDone(item)}
                                />
                            ) : null}
                        </Card>
                    );
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.softbg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softbg },
    header: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
    },
    title: { fontSize: 24, fontWeight: '800', color: colors.ink },
    count: { fontSize: 13, fontWeight: '700', color: colors.mutedink },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.blue,
        textTransform: 'uppercase',
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    eventCard: { gap: spacing.sm },
    eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    time: { fontSize: 16, fontWeight: '800', color: colors.ink },
    eventTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
    location: { fontSize: 13, color: colors.mutedink },
    empty: { textAlign: 'center', color: colors.mutedink, paddingVertical: spacing.xl * 2 },
});
