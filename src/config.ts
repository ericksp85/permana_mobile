import { Platform } from 'react-native';

/**
 * App configuration.
 *
 * API_BASE_URL points at the Laravel backend's versioned API. It can be set per
 * build via the `EXPO_PUBLIC_API_BASE_URL` env var (Expo inlines any
 * `EXPO_PUBLIC_*` variable at build time), so each EAS profile in eas.json
 * points at the right backend — see eas.json's `env` blocks.
 *
 * The default is the live console backend (https://sales.permana.net.id), so
 * the app shares users and data with the web console. To develop against a
 * local Herd site instead, set EXPO_PUBLIC_API_BASE_URL (e.g. in `.env.local`):
 *   - iOS simulator:   http://sales.test/api/v1
 *   - Android emulator: http://10.0.2.2/api/v1  (also sets the Host header below)
 *   - physical device: http://<Mac LAN IP>/api/v1 or an `herd share` URL
 */
export const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://sales.permana.net.id/api/v1';

// The Android emulator can't resolve Herd's `.test` domains, but it reaches the
// Mac's loopback at 10.0.2.2. When pointed there, send the Herd site name as the
// Host header so nginx routes to the right site.
const useAndroidEmulatorHost = Platform.OS === 'android' && API_BASE_URL.includes('10.0.2.2');

/** Extra headers needed to reach the backend in dev (empty unless the build targets the emulator loopback). */
export const API_EXTRA_HEADERS: Record<string, string> = useAndroidEmulatorHost
    ? { Host: 'sales.test' }
    : {};

/** Shown to the server as the token's device name. */
export const DEVICE_NAME = process.env.EXPO_PUBLIC_DEVICE_NAME ?? 'Permana Mobile (dev)';
