import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AttendanceScreen from '../screens/AttendanceScreen';
import CanvassAreaScreen from '../screens/CanvassAreaScreen';
import CanvassScreen from '../screens/CanvassScreen';
import MoreMenuScreen from '../screens/MoreMenuScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProductsScreen from '../screens/ProductsScreen';
import QuotationsScreen from '../screens/QuotationsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import TargetsScreen from '../screens/TargetsScreen';
import { colors } from '../theme';
import type { MoreStackParamList } from './types';

const Stack = createNativeStackNavigator<MoreStackParamList>();

export default function MoreStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerTintColor: colors.navy,
                headerStyle: { backgroundColor: colors.softbg },
                headerTitleStyle: { color: colors.ink },
                contentStyle: { backgroundColor: colors.softbg },
                headerBackTitle: 'More',
            }}
        >
            <Stack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: '' }} />
            <Stack.Screen name="CanvassList" component={CanvassScreen} options={{ title: '' }} />
            <Stack.Screen name="CanvassArea" component={CanvassAreaScreen} options={{ title: 'Area', headerBackTitle: 'Canvassing' }} />
            <Stack.Screen name="Quotations" component={QuotationsScreen} options={{ title: 'Quotations' }} />
            <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Targets & reports' }} />
            <Stack.Screen name="Targets" component={TargetsScreen} options={{ title: 'Targets' }} />
            <Stack.Screen name="Products" component={ProductsScreen} options={{ title: 'Products' }} />
        </Stack.Navigator>
    );
}
