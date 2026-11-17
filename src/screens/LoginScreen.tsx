import { useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, Field } from '../components/ui';
import { colors, spacing } from '../theme';

export default function LoginScreen() {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        setError(undefined);
        setLoading(true);
        try {
            await signIn(email.trim(), password);
        } catch (e) {
            if (e instanceof ApiError) {
                setError(e.firstError() ?? e.message);
            } else {
                console.warn('Login failed (non-API error):', e);
                setError('Can’t reach the server. Check your connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.brand}>
                        <Image
                            source={require('../../assets/icon.png')}
                            style={styles.logo}
                        />
                        <Text style={styles.title}>Permana Sales</Text>
                        <Text style={styles.subtitle}>Every lead, visit and deal — in one app.</Text>
                    </View>

                    <View style={styles.form}>
                        <Field
                            label="Work email"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="name@permana.net.id"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            textContentType="username"
                        />
                        <Field
                            label="Password"
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Password"
                            secureTextEntry
                            textContentType="password"
                            error={error}
                        />
                        <Button label="Sign in" onPress={submit} loading={loading} />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.softbg },
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.xl,
        gap: spacing.xl,
    },
    brand: { alignItems: 'center', gap: spacing.sm },
    logo: { width: 72, height: 72, borderRadius: 18 },
    title: { fontSize: 24, fontWeight: '800', color: colors.ink },
    subtitle: { fontSize: 14, color: colors.mutedink, textAlign: 'center' },
    form: { gap: spacing.lg },
});
