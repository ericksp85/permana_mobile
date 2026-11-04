/**
 * App configuration.
 *
 * API_BASE_URL points at the Laravel backend's versioned API. The iOS
 * simulator shares the Mac's network and DNS, so Herd's `http://sales.test`
 * normally resolves. If your simulator/device can't reach it, change this to
 * your Mac's LAN IP (e.g. http://192.168.1.20/api/v1) or an `herd share` URL.
 */
export const API_BASE_URL = 'http://sales.test/api/v1';

/** Shown to the server as the token's device name. */
export const DEVICE_NAME = 'Permana Mobile (dev)';
