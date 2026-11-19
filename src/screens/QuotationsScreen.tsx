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
import { useNavigation } from '@react-navigation/native';
import { apiFetch } from '../api/client';
import { Card, Pill, rupiah } from '../components/ui';
import { colors, spacing } from '../theme';
import {
    QUOTATION_STATUS_STYLE,
    type Paginated,
    type Quotation,
    type QuotationStatus,
} from '../types/api';

const FILTERS: { value: QuotationStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'verifying', label: 'Verifying' },
    { value: 'waiting_gm', label: 'Waiting GM' },
    { value: 'approved', label: 'Approved' },
    { value: 'returned', label: 'Returned' },
    { value: 'sent', label: 'Sent' },
];

/** A four-dot stepper: request → verify → approve → send. */
export function QuotationStepper({ step }: { step: number }) {
    return (
        <View style={styles.stepper}>
            {[1, 2, 3, 4].map((s) => (
                <View
                    key={s}
                    style={[styles.step, { backgroundColor: s <= step ? colors.teal : colors.line }]}
                />
            ))}
        </View>
    );
}

export default function QuotationsScreen() {
    const navigation = useNavigation();
    const [filter, setFilter] = useState<QuotationStatus | 'all'>('all');
    const [items, setItems] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const load = useCallback(async (status: QuotationStatus | 'all') => {
        try {
            setError(undefined);
            const res = await apiFetch<Paginated<Quotation>>('/quotations', {
                query: { per_page: 50, status: status === 'all' ? undefined : status },
            });
            setItems(res.data);
        } catch {
            setError('Couldn’t load quotations.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load(filter);
    }, [filter, load]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.navy} />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <View style={styles.filterBar}>
                <FlatList showsVerticalScrollIndicator={false}
                    horizontal
                    data={FILTERS}
                    keyExtractor={(f) => f.value}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                    renderItem={({ item: f }) => {
                        const active = f.value === filter;
                        return (
                            <Pressable
                                onPress={() => setFilter(f.value)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                                style={[styles.chip, active && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                    {f.label}
                                </Text>
                            </Pressable>
                        );
                    }}
                />
            </View>
            <FlatList showsVerticalScrollIndicator={false}
                data={items}
                keyExtractor={(q) => String(q.id)}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            load(filter);
                        }}
                        tintColor={colors.navy}
                    />
                }
                ListEmptyComponent={<Text style={styles.empty}>{error ?? 'No quotations yet.'}</Text>}
                renderItem={({ item }) => {
                    const st = QUOTATION_STATUS_STYLE[item.status];
                    return (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${item.company ?? 'lead'}`}
                            onPress={() =>
                                navigation.getParent()?.navigate('Pipeline', {
                                    screen: 'LeadDetail',
                                    initial: false,
                                    params: { leadId: item.lead_id, company: item.company ?? `Lead #${item.lead_id}` },
                                })
                            }
                            style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
                        >
                        <Card style={styles.card}>
                            <View style={styles.top}>
                                <Text style={styles.company} numberOfLines={1}>
                                    {item.company ?? `Lead #${item.lead_id}`}
                                </Text>
                                <Pill bg={st.bg} fg={st.fg}>
                                    {item.status_label}
                                </Pill>
                            </View>
                            {item.number ? <Text style={styles.number}>{item.number}</Text> : null}
                            <View style={styles.bottom}>
                                <Text style={styles.mrc}>{rupiah(item.net_mrc)}/mo</Text>
                                <Text style={styles.terms}>
                                    {item.term_months} mo
                                    {item.discount_pct > 0 ? ` · ${item.discount_pct}% off` : ''}
                                </Text>
                            </View>
                            <QuotationStepper step={item.completed_step} />
                        </Card>
                        </Pressable>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.softbg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softbg },
    filterBar: { paddingVertical: spacing.sm },
    filterRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.white,
    },
    chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.ink },
    chipTextActive: { color: colors.white },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
    card: { gap: spacing.sm },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    company: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
    number: { fontSize: 12, color: colors.mutedink },
    bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    mrc: { fontSize: 15, fontWeight: '800', color: colors.teal },
    terms: { fontSize: 13, color: colors.mutedink },
    stepper: { flexDirection: 'row', gap: 6 },
    step: { flex: 1, height: 5, borderRadius: 3 },
    empty: { textAlign: 'center', color: colors.mutedink, paddingVertical: spacing.xl * 2 },
});
