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
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client';
import { Card } from '../components/ui';
import type { CanvassStackScreenProps } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { CanvassArea } from '../types/api';

export default function CanvassScreen({ navigation }: CanvassStackScreenProps<'CanvassList'>) {
    const [areas, setAreas] = useState<CanvassArea[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const load = useCallback(async () => {
        try {
            setError(undefined);
            const res = await apiFetch<{ data: CanvassArea[] }>('/canvass');
            setAreas(res.data);
        } catch {
            setError('Gagal memuat area. Tarik untuk coba lagi.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', load);
        return unsubscribe;
    }, [navigation, load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load();
    }, [load]);

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
                <Text style={styles.title}>Canvassing</Text>
                <Text style={styles.count}>{areas.length} area</Text>
            </View>
            <FlatList
                data={areas}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />
                }
                ListEmptyComponent={<Text style={styles.empty}>{error ?? 'Belum ada area.'}</Text>}
                renderItem={({ item }) => {
                    const units = item.visits_count ?? 0;
                    const pct = item.target_units > 0 ? Math.min(1, units / item.target_units) : 0;
                    return (
                        <Pressable
                            onPress={() =>
                                navigation.navigate('CanvassArea', { areaId: item.id, name: item.name })
                            }
                            style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
                        >
                            <Card style={styles.areaCard}>
                                <View style={styles.areaTop}>
                                    <Text style={styles.areaName} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.progress}>
                                        {units}/{item.target_units}
                                    </Text>
                                </View>
                                <View style={styles.track}>
                                    <View style={[styles.fill, { width: `${pct * 100}%` }]} />
                                </View>
                            </Card>
                        </Pressable>
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
    areaCard: { gap: spacing.md },
    areaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    areaName: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
    progress: { fontSize: 14, fontWeight: '800', color: colors.teal },
    track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
    fill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.teal },
    empty: { textAlign: 'center', color: colors.mutedink, paddingVertical: spacing.xl * 2 },
});
