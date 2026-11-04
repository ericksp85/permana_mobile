import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LeadDetailScreen from '../screens/LeadDetailScreen';
import PipelineScreen from '../screens/PipelineScreen';
import { colors } from '../theme';
import type { PipelineStackParamList } from './types';

const Stack = createNativeStackNavigator<PipelineStackParamList>();

export default function PipelineStack() {
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
                name="PipelineList"
                component={PipelineScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="LeadDetail"
                component={LeadDetailScreen}
                options={{ title: 'Lead', headerBackTitle: 'Pipeline' }}
            />
        </Stack.Navigator>
    );
}
