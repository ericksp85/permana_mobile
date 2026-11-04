import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import { colors } from '../theme';
import TabNavigator from './TabNavigator';

export default function RootNavigator() {
    const { initializing, user } = useAuth();

    if (initializing) {
        return (
            <View style={styles.splash}>
                <ActivityIndicator color={colors.navy} size="large" />
            </View>
        );
    }

    return user ? <TabNavigator /> : <LoginScreen />;
}

const styles = StyleSheet.create({
    splash: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.softbg,
    },
});
