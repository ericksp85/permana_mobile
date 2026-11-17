import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic config layered on top of app.json.
 *
 * Plain-HTTP access (iOS ATS exception, Android cleartext) exists only so local
 * development can reach a Herd site over http://. Every EAS profile talks to the
 * HTTPS backend, so those exceptions are applied only to local builds
 * (`expo run:*` / `expo start`, where EAS_BUILD_PROFILE is unset) and to the
 * `development` profile — never to `preview` or `production`.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
    const profile = process.env.EAS_BUILD_PROFILE;
    const allowCleartext = profile === undefined || profile === 'development';

    const base = config as ExpoConfig;

    if (!allowCleartext) return base;

    return {
        ...base,
        ios: {
            ...base.ios,
            infoPlist: {
                ...base.ios?.infoPlist,
                NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
            },
        },
        plugins: [
            ...(base.plugins ?? []),
            ['expo-build-properties', { android: { usesCleartextTraffic: true } }],
        ],
    };
};
