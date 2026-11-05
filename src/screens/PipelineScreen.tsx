import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client';
import { Card, StagePill, rupiahShort } from '../components/ui';
import type { PipelineStackScreenProps } from '../navigation/types';
import { colors, radius, spacing } from '../theme';
import type { Lead, Paginated } from '../types/api';

export default function PipelineScreen({
    navigation,
}: PipelineStackScreenProps<'PipelineList'>) {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [query, setQuery] = useState('');
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
            setError('Couldn’t load pipeline. Pull to retry.');
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

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return leads;
        return leads.filter((l) =>
            [l.company, l.contact_name, l.bandwidth]
                .filter(Boolean)
                .some((v) => v!.toLowerCase().includes(q)),
        );
    }, [leads, query]);

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
                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search company, contact, product"
                    placeholderTextColor={colors.mutedink}
                    style={styles.search}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                />
            </View>
            <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyTitle}>{error ? 'Something went wrong' : 'Nothing in this stage'}</Text>
                        <Text style={styles.empty}>
                            {error ?? 'Time to hit the road and canvass.'}
                        </Text>
                    </View>
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
                            <View style={styles.leadMeta}>
                                {item.contact_name ? (
                                    <Text style={styles.contact}>{item.contact_name}</Text>
                                ) : null}
                                {item.verification_status === 'unverified' ? (
                                    <Text style={styles.unverified}>UNVERIFIED</Text>
                                ) : null}
                            </View>
                            <View style={styles.leadBottom}>
                                <Text style={styles.mrc}>{rupiahShort(item.est_mrc)}/mo</Text>
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
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
        gap: spacing.md,
    },
    title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: colors.ink },
    search: {
        height: 44,
        borderRadius: radius.btn,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.white,
        paddingHorizontal: spacing.md,
        fontSize: 14,
        color: colors.ink,
    },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
    leadCard: { gap: spacing.sm },
    leadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    company: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
    leadMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    contact: { fontSize: 13, color: colors.mutedink },
    unverified: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.4,
        color: '#8a5e00',
        backgroundColor: '#fff2d6',
        borderRadius: radius.pill,
        paddingHorizontal: 8,
        paddingVertical: 2,
        overflow: 'hidden',
    },
    leadBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    mrc: { fontSize: 14, fontWeight: '700', color: colors.teal },
    nextStep: { flex: 1, textAlign: 'right', fontSize: 12, color: colors.mutedink },
    emptyWrap: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.xs },
    emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
    empty: { textAlign: 'center', color: colors.mutedink },
});
