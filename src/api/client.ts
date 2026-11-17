import { API_BASE_URL, API_EXTRA_HEADERS } from '../config';

/**
 * A failed API call. `errors` carries Laravel's field validation bag when
 * present (422); a message-only 422 is a business-rule rejection.
 */
export class ApiError extends Error {
    status: number;
    errors?: Record<string, string[]>;

    constructor(status: number, message: string, errors?: Record<string, string[]>) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }

    /** The first field error, if any — handy for inline form messages. */
    firstError(): string | undefined {
        if (!this.errors) return undefined;
        const first = Object.values(this.errors)[0];
        return first?.[0];
    }
}

/**
 * The request never got a usable answer: device offline, server unreachable or
 * the request timed out. Safe to retry later, unlike an ApiError.
 */
export class NetworkError extends Error {
    constructor(message = 'Network request failed') {
        super(message);
        this.name = 'NetworkError';
    }
}

/**
 * True when retrying the same request later may succeed: no connectivity, or a
 * temporary server condition (timeout, rate limit, gateway errors). Validation
 * and business-rule rejections (4xx) are NOT transient.
 */
export function isTransientError(e: unknown): boolean {
    if (e instanceof NetworkError) return true;
    return e instanceof ApiError && [408, 429, 502, 503, 504].includes(e.status);
}

/** How long to wait for the server before giving up. */
const REQUEST_TIMEOUT_MS = 20_000;

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

/** Register a callback fired when an authenticated request gets a 401. */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
    unauthorizedHandler = fn;
}

/** Whether a bearer token is currently set. */
export function hasAuthToken(): boolean {
    return authToken !== null;
}

/** Set (or clear) the bearer token sent with every request. */
export function setAuthToken(token: string | null): void {
    authToken = token;
}

type Options = {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    /** Extra query params appended to the URL. */
    query?: Record<string, string | number | undefined>;
    /** Extra request headers (e.g. Idempotency-Key). */
    headers?: Record<string, string>;
};

/**
 * Call the Permana API and return the parsed JSON body, throwing an ApiError
 * on any non-2xx response.
 */
export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
    // Build the query string by hand — React Native's URL/searchParams support
    // is incomplete, so we don't rely on it.
    let url = API_BASE_URL + path;
    if (options.query) {
        const pairs = Object.entries(options.query)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
        if (pairs.length > 0) url += `?${pairs.join('&')}`;
    }

    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...API_EXTRA_HEADERS,
        ...options.headers,
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    let text: string;
    try {
        response = await fetch(url, {
            method: options.method ?? 'GET',
            headers,
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
        });
        text = await response.text();
    } catch (e) {
        throw new NetworkError(
            controller.signal.aborted ? 'The request timed out' : e instanceof Error ? e.message : undefined,
        );
    } finally {
        clearTimeout(timer);
    }

    // Error pages (502, maintenance) come back as HTML — don't let a JSON parse
    // failure masquerade as a connectivity problem.
    let data: any = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }

    if (response.status === 401 && authToken) {
        unauthorizedHandler?.();
    }

    if (!response.ok) {
        throw new ApiError(
            response.status,
            data?.message ?? `Request failed (${response.status})`,
            data?.errors,
        );
    }

    if (text && data === null) {
        throw new ApiError(response.status, 'Unexpected response from the server.');
    }

    return data as T;
}
