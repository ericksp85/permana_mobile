import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { useOffline } from './OfflineContext';

/**
 * A slim status strip for the field screens: shows when the device is offline
 * or there are changes still waiting to sync. Renders nothing when online and
 * the queue is empty.
 */
export default function SyncBanner() {
    const { online, pending } = useOffline();
    if (online && pending === 0) return null;

    const offline = !online;
    const label = offline
        ? pending > 0
            ? `Offline · ${pending} change${pending > 1 ? 's' : ''} will sync`
            : 'Offline · changes will be saved on this device'
        : `Syncing ${pending} change${pending > 1 ? 's' : ''}…`;

    return (
        <View
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={label}
            style={[styles.bar, offline ? styles.offline : styles.syncing]}
        >
            <Ionicons
                name={offline ? 'cloud-offline-outline' : 'sync-outline'}
                size={16}
                color={offline ? '#8a5e00' : colors.tealDark}
            />
            <Text style={[styles.text, { color: offline ? '#8a5e00' : colors.tealDark }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.btn,
    },
    offline: { backgroundColor: '#fff2d6' },
    syncing: { backgroundColor: '#ddf5f6' },
    text: { fontSize: 13, fontWeight: '700' },
});
