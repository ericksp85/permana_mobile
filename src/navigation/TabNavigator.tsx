import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CanvassStack from './CanvassStack';
import PipelineStack from './PipelineStack';
import AttendanceScreen from '../screens/AttendanceScreen';
import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    Beranda: 'home',
    Pipeline: 'git-branch',
    Jadwal: 'calendar',
    Absensi: 'finger-print',
    Canvass: 'map',
};

export default function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: colors.navy,
                tabBarInactiveTintColor: colors.mutedink,
                tabBarStyle: { borderTopColor: colors.line },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
                tabBarIcon: ({ color, size }) => (
                    <Ionicons name={ICONS[route.name] ?? 'ellipse'} size={size} color={color} />
                ),
            })}
        >
            <Tab.Screen name="Beranda" component={HomeScreen} />
            <Tab.Screen name="Pipeline" component={PipelineStack} />
            <Tab.Screen name="Jadwal" component={ScheduleScreen} />
            <Tab.Screen name="Absensi" component={AttendanceScreen} />
            <Tab.Screen name="Canvass" component={CanvassStack} />
        </Tab.Navigator>
    );
}
