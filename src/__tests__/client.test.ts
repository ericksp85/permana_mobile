import {
    ApiError,
    NetworkError,
    apiFetch,
    isTransientError,
    setAuthToken,
    setGetRetryDelays,
    setUnauthorizedHandler,
} from '../api/client';

function respond(status: number, body: string) {
    return Promise.resolve({ ok: status >= 200 && status < 300, status, text: () => Promise.resolve(body) });
}

const fetchMock = jest.fn();
beforeEach(() => {
    fetchMock.mockReset();
    (globalThis as any).fetch = fetchMock;
    setAuthToken(null);
    setUnauthorizedHandler(null);
    setGetRetryDelays([0, 0]);
});

describe('apiFetch', () => {
    it('returns parsed JSON and sends the bearer token', async () => {
        setAuthToken('abc');
        fetchMock.mockReturnValue(respond(200, '{"ok":true}'));
        await expect(apiFetch('/x')).resolves.toEqual({ ok: true });
        expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
    });

    it('throws ApiError with the validation bag on 422', async () => {
        fetchMock.mockReturnValue(respond(422, '{"message":"bad","errors":{"email":["Invalid"]}}'));
        const err: any = await apiFetch('/x').catch((e) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(422);
        expect(err.firstError()).toBe('Invalid');
    });

    it('treats an HTML error page as an ApiError, not a connectivity failure', async () => {
        fetchMock.mockReturnValue(respond(502, '<html>Bad gateway</html>'));
        const err: any = await apiFetch('/x').catch((e) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(502);
        expect(isTransientError(err)).toBe(true);
    });

    it('throws NetworkError when fetch rejects', async () => {
        fetchMock.mockRejectedValue(new TypeError('Network request failed'));
        const err: any = await apiFetch('/x').catch((e) => e);
        expect(err).toBeInstanceOf(NetworkError);
        expect(isTransientError(err)).toBe(true);
    });

    it('does not treat validation errors as transient', async () => {
        fetchMock.mockReturnValue(respond(422, '{"message":"no"}'));
        const err: any = await apiFetch('/x').catch((e) => e);
        expect(isTransientError(err)).toBe(false);
    });

    it('fires the unauthorized handler on 401 only when a token is set', async () => {
        const handler = jest.fn();
        setUnauthorizedHandler(handler);
        fetchMock.mockReturnValue(respond(401, '{"message":"Unauthenticated."}'));

        await apiFetch('/login').catch(() => {});
        expect(handler).not.toHaveBeenCalled();

        setAuthToken('abc');
        await apiFetch('/me').catch(() => {});
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('times out as a NetworkError', async () => {
        jest.useFakeTimers();
        fetchMock.mockImplementation(
            (_url: string, init: { signal: AbortSignal }) =>
                new Promise((_resolve, reject) => {
                    init.signal.addEventListener('abort', () => reject(new Error('aborted')));
                }),
        );
        const pending = apiFetch('/slow').catch((e) => e);
        await jest.advanceTimersByTimeAsync(60_010); // 3 attempts x 20s timeout
        const err: any = await pending;
        jest.useRealTimers();
        expect(err).toBeInstanceOf(NetworkError);
        expect(err.message).toMatch(/timed out/);
    });

    it('retries a GET after a 500 and returns the later success', async () => {
        fetchMock
            .mockReturnValueOnce(respond(500, '{"message":"database is locked"}'))
            .mockReturnValueOnce(respond(200, '{"ok":true}'));
        await expect(apiFetch('/x')).resolves.toEqual({ ok: true });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('gives up after the retries on a persistent 500', async () => {
        fetchMock.mockReturnValue(respond(500, '{"message":"boom"}'));
        const err: any = await apiFetch('/x').catch((e) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('never retries a POST, even on a 500', async () => {
        fetchMock.mockReturnValue(respond(500, '{"message":"boom"}'));
        await apiFetch('/x', { method: 'POST', body: {} }).catch(() => {});
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not retry a GET on a 4xx', async () => {
        fetchMock.mockReturnValue(respond(404, '{"message":"nope"}'));
        await apiFetch('/x').catch(() => {});
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
