import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../api/client';
import { Card, Pill, rupiah } from '../components/ui';
import { colors, spacing } from '../theme';
import type { Product } from '../types/api';

export default function ProductsScreen() {
    const [items, setItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const load = useCallback(async () => {
        try {
            setError(undefined);
            const res = await apiFetch<{ data: Product[] }>('/products');
            setItems(res.data);
        } catch {
            setError('Couldn’t load products.');
        } finally {
            setLoading(false);
            setRefreshing(false);
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

    return (
        <FlatList showsVerticalScrollIndicator={false}
            style={styles.screen}
            data={items}
            keyExtractor={(p) => String(p.id)}
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
            ListEmptyComponent={<Text style={styles.empty}>{error ?? 'No products yet.'}</Text>}
            renderItem={({ item }) => (
                <Card style={styles.card}>
                    <View style={styles.top}>
                        <Text style={styles.name} numberOfLines={2}>
                            {item.name}
                        </Text>
                        <Pill bg="#e8eff4" fg="#2c5d78">
                            {item.media}
                        </Pill>
                    </View>
                    <Text style={styles.meta}>
                        {item.code} · {item.group}
                    </Text>
                    <Text style={styles.price}>
                        {item.starting_price ? `From ${rupiah(item.starting_price)}/mo` : 'Price on request'}
                    </Text>
                </Card>
            )}
        />
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.softbg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softbg },
    list: { padding: spacing.lg, gap: spacing.md },
    card: { gap: spacing.sm },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    name: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
    meta: { fontSize: 12, color: colors.mutedink },
    price: { fontSize: 15, fontWeight: '800', color: colors.teal },
    empty: { textAlign: 'center', color: colors.mutedink, paddingVertical: spacing.xl * 2 },
});
