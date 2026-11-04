import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { Button, Card } from '../components/ui';
import { colors, spacing } from '../theme';

const ROADMAP: { label: string; done: boolean }[] = [
    { label: 'Masuk & sesi token', done: true },
    { label: 'Pipeline / daftar lead', done: true },
    { label: 'Detail lead & aktivitas', done: true },
    { label: 'Jadwal', done: true },
    { label: 'Absensi (selfie + GPS)', done: true },
    { label: 'Canvassing + foto', done: false },
    { label: 'Quotation, target, laporan', done: false },
];

export default function HomeScreen() {
    const { user, signOut } = useAuth();

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.hero}>
                    <Text style={styles.hello}>Halo,</Text>
                    <Text style={styles.name}>{user?.name}</Text>
                    <Text style={styles.role}>
                        {user?.role_label}
                        {user?.team ? ` · ${user.team}` : ''}
                    </Text>
                </View>

                <Card style={{ gap: spacing.md }}>
                    <Text style={styles.cardTitle}>Status pembangunan</Text>
                    {ROADMAP.map((item) => (
                        <View key={item.label} style={styles.row}>
                            <View
                                style={[
                                    styles.dot,
                                    { backgroundColor: item.done ? colors.success : colors.line },
                                ]}
                            />
                            <Text
                                style={[
                                    styles.rowLabel,
                                    { color: item.done ? colors.ink : colors.mutedink },
                                ]}
                            >
                                {item.label}
                            </Text>
                        </View>
                    ))}
                </Card>

                <Button label="Keluar" variant="ghost" onPress={signOut} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.softbg },
    container: { padding: spacing.lg, gap: spacing.lg },
    hero: { gap: 2 },
    hello: { fontSize: 15, color: colors.mutedink },
    name: { fontSize: 26, fontWeight: '800', color: colors.ink },
    role: { fontSize: 14, color: colors.blue, fontWeight: '600' },
    cardTitle: { fontSize: 13, fontWeight: '800', color: colors.mutedink, textTransform: 'uppercase' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    dot: { width: 10, height: 10, borderRadius: 5 },
    rowLabel: { fontSize: 15, fontWeight: '600' },
});
