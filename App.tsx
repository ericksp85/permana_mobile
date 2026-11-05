import { useFonts } from '@expo-google-fonts/plus-jakarta-sans';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { installJakartaFont, jakartaFontMap } from './src/fonts';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';

// Map fontWeight → Jakarta family globally before any Text renders.
installJakartaFont();

export default function App() {
    const [fontsLoaded] = useFonts(jakartaFontMap);

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softbg }}>
                <ActivityIndicator color={colors.navy} />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <AuthProvider>
                <NavigationContainer>
                    <StatusBar style="dark" />
                    <RootNavigator />
                </NavigationContainer>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
