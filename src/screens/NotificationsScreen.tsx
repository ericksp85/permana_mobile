import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { apiFetch } from '../api/client';
import { Card } from '../components/ui';
import { colors, spacing } from '../theme';
import type { NotificationItem, NotificationsResponse } from '../types/api';

function whenLabel(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function NotificationsScreen() {
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const load = useCallback(async () => {
        try {
            setError(undefined);
            const res = await apiFetch<NotificationsResponse>('/notifications', {
                query: { per_page: 50 },
            });
            setItems(res.data);
            setUnread(res.unread);
        } catch {
            setError('Couldn’t load notifications.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const markOne = async (item: NotificationItem) => {
        if (item.read) return;
        setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
        setUnread((u) => Math.max(0, u - 1));
        try {
            await apiFetch(`/notifications/${item.id}/read`, { method: 'POST' });
        } catch {
            load();
        }
    };

    const markAll = async () => {
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnread(0);
        try {
            await apiFetch('/notifications/read', { method: 'POST' });
        } catch {
            load();
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.navy} />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            {unread > 0 ? (
                <View style={styles.bar}>
                    <Text style={styles.unread}>{unread} unread</Text>
                    <Pressable onPress={markAll} hitSlop={10} accessibilityRole="button">
                        <Text style={styles.markAll}>Mark all read</Text>
                    </Pressable>
                </View>
            ) : null}
            <FlatList showsVerticalScrollIndicator={false}
                data={items}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
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
                ListEmptyComponent={
                    <Text style={styles.empty}>{error ?? 'No notifications'}</Text>
                }
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => markOne(item)}
                        accessibilityRole="button"
                        style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
                    >
                        <Card style={[styles.item, !item.read && styles.itemUnread]}>
                            <View style={styles.itemTop}>
                                {!item.read ? <View style={styles.dot} /> : null}
                                <Text style={styles.title} numberOfLines={1}>
                                    {item.title ?? item.tag ?? 'Notification'}
                                </Text>
                                <Text style={styles.when}>{whenLabel(item.created_at)}</Text>
                            </View>
                            {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
                        </Card>
                    </Pressable>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.softbg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softbg },
    bar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    unread: { fontSize: 13, fontWeight: '700', color: colors.mutedink },
    markAll: { fontSize: 13, fontWeight: '700', color: colors.blue },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
    item: { gap: spacing.xs },
    itemUnread: { borderColor: colors.teal },
    itemTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.teal },
    title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
    when: { fontSize: 12, color: colors.mutedink },
    body: { fontSize: 14, color: colors.ink },
    empty: { textAlign: 'center', color: colors.mutedink, paddingVertical: spacing.xl * 2 },
});
