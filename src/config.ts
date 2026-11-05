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
export const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://sales.test/api/v1';

/** Shown to the server as the token's device name. */
export const DEVICE_NAME = process.env.EXPO_PUBLIC_DEVICE_NAME ?? 'Permana Mobile (dev)';
