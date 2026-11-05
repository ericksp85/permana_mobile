import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

/** A tab that is on the roadmap but not built yet. */
export default function PlaceholderScreen({ title }: { title: string }) {
    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.center}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.note}>Coming in a later version.</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.softbg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
    title: { fontSize: 22, fontWeight: '800', color: colors.ink },
    note: { fontSize: 14, color: colors.mutedink, textAlign: 'center' },
});
