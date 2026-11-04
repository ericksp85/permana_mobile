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
import { Card, StagePill, rupiahShort } from '../components/ui';
import type { PipelineStackScreenProps } from '../navigation/types';
import { colors, spacing } from '../theme';
import type { Lead, Paginated } from '../types/api';

export default function PipelineScreen({
    navigation,
}: PipelineStackScreenProps<'PipelineList'>) {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const load = useCallback(async () => {
        try {
            setError(undefined);
            const res = await apiFetch<Paginated<Lead>>('/leads', {
                query: { per_page: 50 },
            });
            setLeads(res.data);
        } catch {
            setError('Gagal memuat pipeline. Tarik untuk coba lagi.');
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
                <Text style={styles.title}>Pipeline</Text>
                <Text style={styles.count}>{leads.length} lead</Text>
            </View>
            <FlatList
                data={leads}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />
                }
                ListEmptyComponent={
                    <Text style={styles.empty}>
                        {error ?? 'Belum ada lead.'}
                    </Text>
                }
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() =>
                            navigation.navigate('LeadDetail', {
                                leadId: item.id,
                                company: item.company,
                            })
                        }
                        style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
                    >
                        <Card style={styles.leadCard}>
                            <View style={styles.leadTop}>
                                <Text style={styles.company} numberOfLines={1}>
                                    {item.company}
                                </Text>
                                <StagePill stage={item.stage} label={item.stage_label} />
                            </View>
                            {item.contact_name ? (
                                <Text style={styles.contact}>{item.contact_name}</Text>
                            ) : null}
                            <View style={styles.leadBottom}>
                                <Text style={styles.mrc}>{rupiahShort(item.est_mrc)}/bln</Text>
                                {item.next_step ? (
                                    <Text style={styles.nextStep} numberOfLines={1}>
                                        {item.next_step}
                                    </Text>
                                ) : null}
                            </View>
                        </Card>
                    </Pressable>
                )}
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
    leadCard: { gap: spacing.sm },
    leadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    company: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
    contact: { fontSize: 13, color: colors.mutedink },
    leadBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    mrc: { fontSize: 14, fontWeight: '700', color: colors.teal },
    nextStep: { flex: 1, textAlign: 'right', fontSize: 12, color: colors.mutedink },
    empty: { textAlign: 'center', color: colors.mutedink, paddingVertical: spacing.xl * 2 },
});
