import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeStack from './HomeStack';
import MoreStack from './MoreStack';
import PipelineStack from './PipelineStack';
import ScheduleScreen from '../screens/ScheduleScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    Home: 'home',
    Pipeline: 'git-branch',
    Schedule: 'calendar',
    More: 'ellipsis-horizontal-circle',
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
            <Tab.Screen name="Home" component={HomeStack} />
            <Tab.Screen name="Pipeline" component={PipelineStack} />
            <Tab.Screen name="Schedule" component={ScheduleScreen} />
            <Tab.Screen name="More" component={MoreStack} />
        </Tab.Navigator>
    );
}
