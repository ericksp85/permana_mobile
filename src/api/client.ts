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

let authToken: string | null = null;

/** Set (or clear) the bearer token sent with every request. */
export function setAuthToken(token: string | null): void {
    authToken = token;
}

type Options = {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    /** Extra query params appended to the URL. */
    query?: Record<string, string | number | undefined>;
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
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
        throw new ApiError(
            response.status,
            data?.message ?? `Request failed (${response.status})`,
            data?.errors,
        );
    }

    return data as T;
}
