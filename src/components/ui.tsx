import type { ReactNode } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    type StyleProp,
    type TextInputProps,
    type ViewStyle,
} from 'react-native';
import { colors, radius, spacing, stageColors } from '../theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
    return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
    label,
    onPress,
    loading = false,
    disabled = false,
    variant = 'primary',
}: {
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'ghost';
}) {
    const isPrimary = variant === 'primary';
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            style={({ pressed }) => [
                styles.button,
                isPrimary ? styles.buttonPrimary : styles.buttonGhost,
                (disabled || loading) && styles.buttonDisabled,
                pressed && !disabled && { opacity: 0.85 },
            ]}
        >
            {loading ? (
                <ActivityIndicator color={isPrimary ? colors.white : colors.navy} />
            ) : (
                <Text style={[styles.buttonText, isPrimary ? styles.buttonTextPrimary : styles.buttonTextGhost]}>
                    {label}
                </Text>
            )}
        </Pressable>
    );
}

export function Field({
    label,
    error,
    ...props
}: TextInputProps & { label: string; error?: string }) {
    return (
        <View style={{ gap: spacing.xs }}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TextInput
                placeholderTextColor={colors.mutedink}
                style={[styles.input, error ? { borderColor: colors.danger } : null]}
                {...props}
            />
            {error ? <Text style={styles.fieldError}>{error}</Text> : null}
        </View>
    );
}

export function Pill({ bg, fg, children }: { bg: string; fg: string; children: ReactNode }) {
    return (
        <View style={[styles.pill, { backgroundColor: bg }]}>
            <Text style={[styles.pillText, { color: fg }]}>{children}</Text>
        </View>
    );
}

export function StagePill({ stage, label }: { stage: string; label: string }) {
    const c = stageColors[stage] ?? { bg: colors.line, fg: colors.ink };
    return (
        <Pill bg={c.bg} fg={c.fg}>
            {label}
        </Pill>
    );
}

/** Format integer Rupiah as a compact "Rp 18.5jt" summary string. */
export function rupiahShort(value: number | null | undefined): string {
    if (!value) return 'Rp 0';
    if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
    if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
    if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
    return `Rp ${value}`;
}

/** Format integer Rupiah in full with thousands separators: "Rp 1.500.000". */
export function rupiah(value: number | null | undefined): string {
    const n = value ?? 0;
    const grouped = Math.round(n)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Rp ${grouped}`;
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.line,
        padding: spacing.lg,
    },
    button: {
        height: 50,
        borderRadius: radius.btn,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    buttonPrimary: { backgroundColor: colors.navy },
    buttonGhost: { backgroundColor: colors.softbg, borderWidth: 1, borderColor: colors.line },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { fontSize: 15, fontWeight: '700' },
    buttonTextPrimary: { color: colors.white },
    buttonTextGhost: { color: colors.navy },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.mutedink },
    input: {
        height: 48,
        borderRadius: radius.btn,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.white,
        paddingHorizontal: spacing.md,
        fontSize: 15,
        color: colors.ink,
    },
    fieldError: { fontSize: 12, color: colors.danger },
    pill: {
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    pillText: { fontSize: 12, fontWeight: '700' },
});
