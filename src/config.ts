import { Platform } from 'react-native';

/**
 * App configuration.
 *
 * API_BASE_URL points at the Laravel backend's versioned API. It can be set per
 * build via the `EXPO_PUBLIC_API_BASE_URL` env var (Expo inlines any
 * `EXPO_PUBLIC_*` variable at build time), so each EAS profile in eas.json
 * points at the right backend — see eas.json's `env` blocks.
 *
 * The default is Herd's `http://sales.test`, used for local dev. The iOS
 * simulator shares the Mac's network and DNS, so that normally resolves. If
 * your simulator/device can't reach it, set EXPO_PUBLIC_API_BASE_URL to your
 * Mac's LAN IP (e.g. http://192.168.1.20/api/v1) or an `herd share` URL.
 */
// The Android emulator can't resolve Herd's `.test` domains, but it reaches the
// Mac's loopback at 10.0.2.2. In dev we call that and send the Herd site name as
// the Host header so nginx routes to the right site.
const useAndroidEmulatorHost =
    __DEV__ && Platform.OS === 'android' && !process.env.EXPO_PUBLIC_API_BASE_URL;

export const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    (useAndroidEmulatorHost ? 'http://10.0.2.2/api/v1' : 'http://sales.test/api/v1');

/** Extra headers needed to reach the backend in dev (empty in release builds). */
export const API_EXTRA_HEADERS: Record<string, string> = useAndroidEmulatorHost
    ? { Host: 'sales.test' }
    : {};

/** Shown to the server as the token's device name. */
export const DEVICE_NAME = process.env.EXPO_PUBLIC_DEVICE_NAME ?? 'Permana Mobile (dev)';
