import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CanvassAreaScreen from '../screens/CanvassAreaScreen';
import CanvassScreen from '../screens/CanvassScreen';
import { colors } from '../theme';
import type { CanvassStackParamList } from './types';

const Stack = createNativeStackNavigator<CanvassStackParamList>();

export default function CanvassStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerTintColor: colors.navy,
                headerStyle: { backgroundColor: colors.softbg },
                headerTitleStyle: { color: colors.ink },
                contentStyle: { backgroundColor: colors.softbg },
            }}
        >
            <Stack.Screen
                name="CanvassList"
                component={CanvassScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="CanvassArea"
                component={CanvassAreaScreen}
                options={{ title: 'Area', headerBackTitle: 'Canvassing' }}
            />
        </Stack.Navigator>
    );
}
