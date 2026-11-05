import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
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
            }}
        >
            <Stack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
    );
}
