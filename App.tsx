import { useFonts } from '@expo-google-fonts/plus-jakarta-sans';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './src/components/ErrorBoundary';
import { installGlobalErrorHandler } from './src/monitoring';
import { AuthProvider } from './src/auth/AuthContext';
import { installJakartaFont, jakartaFontMap } from './src/fonts';
import RootNavigator from './src/navigation/RootNavigator';
import { OfflineProvider } from './src/offline/OfflineContext';
import { colors } from './src/theme';

// Map fontWeight → Jakarta family globally before any Text renders.
installJakartaFont();
installGlobalErrorHandler();

// Keep the native splash up until fonts are ready, so there is no flash of an empty screen.
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
    const [fontsLoaded] = useFonts(jakartaFontMap);

    useEffect(() => {
        if (fontsLoaded) void SplashScreen.hideAsync().catch(() => {});
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softbg }}>
                <ActivityIndicator color={colors.navy} />
            </View>
        );
    }

    return (
        <ErrorBoundary>
        <SafeAreaProvider>
            <OfflineProvider>
                <AuthProvider>
                    <NavigationContainer>
                        <StatusBar style="dark" />
                        <RootNavigator />
                    </NavigationContainer>
                </AuthProvider>
            </OfflineProvider>
        </SafeAreaProvider>
        </ErrorBoundary>
    );
}
