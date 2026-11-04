import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import QuotationsScreen from '../screens/QuotationsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import TargetsScreen from '../screens/TargetsScreen';
import { colors } from '../theme';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerTintColor: colors.navy,
                headerStyle: { backgroundColor: colors.softbg },
                headerTitleStyle: { color: colors.ink },
                contentStyle: { backgroundColor: colors.softbg },
                headerBackTitle: 'Beranda',
            }}
        >
            <Stack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifikasi' }} />
            <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Laporan' }} />
            <Stack.Screen name="Targets" component={TargetsScreen} options={{ title: 'Target' }} />
            <Stack.Screen name="Quotations" component={QuotationsScreen} options={{ title: 'Penawaran' }} />
        </Stack.Navigator>
    );
}
