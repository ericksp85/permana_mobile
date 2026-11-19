import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { ApiError, apiFetch } from '../api/client';
import { Button, Field } from '../components/ui';
import type { PipelineStackScreenProps } from '../navigation/types';
import { useOffline } from '../offline/OfflineContext';
import { submitOrQueue } from '../offline/sync';
import { colors, radius, spacing } from '../theme';
import type { Lead, Product } from '../types/api';

export default function NewLeadScreen({ navigation }: PipelineStackScreenProps<'NewLead'>) {
    const { online } = useOffline();
    const [company, setCompany] = useState('');
    const [contact, setContact] = useState('');
    const [phone, setPhone] = useState('');
    const [bandwidth, setBandwidth] = useState('');
    const [mrc, setMrc] = useState('');
    const [productId, setProductId] = useState<number | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [locating, setLocating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | undefined>();

    useEffect(() => {
        apiFetch<{ data: Product[] }>('/products')
            .then((res) => setProducts(res.data.filter((p) => p.is_active)))
            .catch(() => {}); // product is optional; the form still works without the list
    }, []);

    const tagLocation = async () => {
        setLocating(true);
        try {
            const perm = await Location.requestForegroundPermissionsAsync();
            if (perm.status !== 'granted') {
                Alert.alert('Location permission', 'Enable location to tag this lead.');
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } catch {
            Alert.alert('Location', 'Couldn’t get your location.');
        } finally {
            setLocating(false);
        }
    };

    const submit = async () => {
        setFormError(undefined);
        const next: Record<string, string> = {};
        if (!company.trim()) next.company = 'Company name is required.';
        const mrcDigits = mrc.replace(/\D/g, '');
        if (mrc.trim() && !mrcDigits) next.est_mrc = 'Enter a number, e.g. 2000000.';
        setErrors(next);
        if (Object.keys(next).length) return;

        setSubmitting(true);
        try {
            const res = await submitOrQueue<{ data: Lead }>(online, {
                kind: 'lead',
                label: `New lead · ${company.trim()}`,
                path: '/leads',
                body: {
                    company: company.trim(),
                    contact_name: contact.trim() || undefined,
                    phone: phone.trim() || undefined,
                    product_id: productId ?? undefined,
                    bandwidth: bandwidth.trim() || undefined,
                    est_mrc: mrcDigits ? Number(mrcDigits) : undefined,
                    lat: coords?.lat,
                    lng: coords?.lng,
                },
            });
            if (res.queued) {
                Alert.alert('Saved offline', 'This lead will be created automatically when you’re back online.');
            }
            navigation.goBack();
        } catch (e) {
            if (e instanceof ApiError) {
                const fieldErrors: Record<string, string> = {};
                for (const [k, v] of Object.entries(e.errors ?? {})) {
                    fieldErrors[k] = Array.isArray(v) ? String(v[0]) : String(v);
                }
                setErrors(fieldErrors);
                setFormError(
                    Object.keys(fieldErrors).length ? undefined : e.message || 'Couldn’t create the lead.',
                );
            } else {
                setFormError('Couldn’t create the lead.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex}
        >
            <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Field label="Company *" value={company} onChangeText={setCompany} placeholder="PT / CV / personal name" error={errors.company} />
                <Field label="Contact name" value={contact} onChangeText={setContact} placeholder="Person in charge" error={errors.contact_name} />
                <Field label="Phone / WhatsApp" value={phone} onChangeText={setPhone} placeholder="08xxxxxxxxxx" keyboardType="phone-pad" error={errors.phone} />

                {products.length ? (
                    <View style={{ gap: spacing.xs }}>
                        <Text style={styles.label}>Product</Text>
                        <View style={styles.chips}>
                            {products.map((p) => {
                                const on = p.id === productId;
                                return (
                                    <Pressable
                                        key={p.id}
                                        onPress={() => setProductId(on ? null : p.id)}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: on }}
                                        style={[styles.chip, on && styles.chipOn]}
                                    >
                                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{p.name}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                        {errors.product_id ? <Text style={styles.err}>{errors.product_id}</Text> : null}
                    </View>
                ) : null}

                <Field label="Bandwidth" value={bandwidth} onChangeText={setBandwidth} placeholder="e.g. 20 Mbps" error={errors.bandwidth} />
                <Field label="Estimated MRC (Rp / month)" value={mrc} onChangeText={setMrc} placeholder="2000000" keyboardType="number-pad" error={errors.est_mrc} />

                <View style={{ gap: spacing.xs }}>
                    <Text style={styles.label}>Location (optional)</Text>
                    <Button
                        label={coords ? `Tagged · ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Tag my current location'}
                        variant="ghost"
                        onPress={tagLocation}
                        loading={locating}
                    />
                </View>

                {formError ? <Text style={styles.err} accessibilityRole="alert">{formError}</Text> : null}
                <Button label="Create lead" onPress={submit} loading={submitting} />
                <Text style={styles.hint}>The lead is sent to Admin Sales for verification.</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.softbg },
    content: { padding: spacing.xl, gap: spacing.lg },
    label: { fontSize: 13, fontWeight: '700', color: colors.ink },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: '#fff',
    },
    chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
    chipText: { fontSize: 13, color: colors.ink, fontWeight: '600' },
    chipTextOn: { color: '#fff' },
    err: { color: colors.danger, fontSize: 13 },
    hint: { color: colors.mutedink, fontSize: 12, textAlign: 'center' },
});
