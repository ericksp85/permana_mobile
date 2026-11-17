jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Mods = {
    client: typeof import('../api/client');
    sync: typeof import('../offline/sync');
    outbox: typeof import('../offline/outbox');
};

const entry = { kind: 'checkin' as const, label: 'Check-in', path: '/attendance/check-in', body: { a: 1 } };
const fetchMock = jest.fn();
let m: Mods;

function respond(status: number, body = '{}') {
    return Promise.resolve({ ok: status < 400, status, text: () => Promise.resolve(body) });
}

beforeEach(async () => {
    jest.resetModules();
    fetchMock.mockReset();
    (globalThis as any).fetch = fetchMock;
    const storage = require('@react-native-async-storage/async-storage');
    await storage.clear();
    m = {
        client: require('../api/client'),
        sync: require('../offline/sync'),
        outbox: require('../offline/outbox'),
    };
    m.client.setAuthToken('token');
    m.outbox.setOutboxOwner(1);
});

describe('submitOrQueue', () => {
    it('queues straight away when offline', async () => {
        const r = await m.sync.submitOrQueue(false, entry);
        expect(r).toEqual({ queued: true });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(m.outbox.outboxCount()).toBe(1);
    });

    it('queues on a network failure', async () => {
        fetchMock.mockRejectedValue(new TypeError('Network request failed'));
        expect(await m.sync.submitOrQueue(true, entry)).toEqual({ queued: true });
        expect(m.outbox.outboxCount()).toBe(1);
    });

    it('queues on a temporary 503', async () => {
        fetchMock.mockReturnValue(respond(503, '<html>'));
        expect(await m.sync.submitOrQueue(true, entry)).toEqual({ queued: true });
    });

    it('propagates a validation error without queueing', async () => {
        fetchMock.mockReturnValue(respond(422, '{"message":"Already checked in"}'));
        await expect(m.sync.submitOrQueue(true, entry)).rejects.toBeInstanceOf(m.client.ApiError);
        expect(m.outbox.outboxCount()).toBe(0);
    });
});

describe('flushOutbox', () => {
    it('sends items in order and empties the queue', async () => {
        await m.outbox.enqueue({ ...entry, label: 'one' });
        await m.outbox.enqueue({ ...entry, label: 'two' });
        fetchMock.mockReturnValue(respond(200));
        const r = await m.sync.flushOutbox();
        expect(r).toMatchObject({ sent: 2, dropped: 0, remaining: 0 });
    });

    it.each([500, 503, 429, 401])('keeps items on a %i', async (status) => {
        await m.outbox.enqueue(entry);
        fetchMock.mockReturnValue(respond(status, '{"message":"x"}'));
        const r = await m.sync.flushOutbox();
        expect(r).toMatchObject({ sent: 0, dropped: 0, remaining: 1 });
    });

    it('keeps everything when the network drops mid-flush', async () => {
        await m.outbox.enqueue({ ...entry, label: 'one' });
        await m.outbox.enqueue({ ...entry, label: 'two' });
        fetchMock.mockReturnValueOnce(respond(200)).mockRejectedValue(new TypeError('offline'));
        const r = await m.sync.flushOutbox();
        expect(r).toMatchObject({ sent: 1, remaining: 1 });
    });

    it('drops and reports a definitive 422 rejection, then continues', async () => {
        await m.outbox.enqueue({ ...entry, label: 'bad' });
        await m.outbox.enqueue({ ...entry, label: 'good' });
        fetchMock
            .mockReturnValueOnce(respond(422, '{"message":"Already checked in"}'))
            .mockReturnValueOnce(respond(200));
        const r = await m.sync.flushOutbox();
        expect(r).toMatchObject({ sent: 1, dropped: 1, remaining: 0 });
        expect(r.droppedItems).toEqual([{ label: 'bad', message: 'Already checked in' }]);
    });

    it('does nothing without a session', async () => {
        await m.outbox.enqueue(entry);
        m.client.setAuthToken(null);
        const r = await m.sync.flushOutbox();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(r.remaining).toBe(1);
    });

    it('loads persisted items before flushing', async () => {
        jest.resetModules(); // simulate a fresh app start with items already on disk
        const storage = require('@react-native-async-storage/async-storage');
        await storage.setItem(
            'permana_outbox_v1',
            JSON.stringify([{ id: '1', kind: 'checkin', label: 'Saved', method: 'POST', path: '/x', body: {}, createdAt: 1 }]),
        );
        const client = require('../api/client');
        const sync = require('../offline/sync');
        client.setAuthToken('token');
        require('../offline/outbox').setOutboxOwner(1);
        fetchMock.mockReturnValue(respond(200));
        const r = await sync.flushOutbox(); // queue not loaded yet at this point
        expect(r.sent).toBe(1);
    });
});

describe('account ownership', () => {
    it("never sends one account's queued items under another account", async () => {
        await m.outbox.enqueue({ ...entry, label: 'from user 1' });
        m.outbox.setOutboxOwner(2);
        fetchMock.mockReturnValue(respond(200));

        expect(m.outbox.outboxCount()).toBe(0);
        const r = await m.sync.flushOutbox();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(r.sent).toBe(0);

        // ...and they are still there for user 1.
        m.outbox.setOutboxOwner(1);
        expect(m.outbox.outboxCount()).toBe(1);
        const again = await m.sync.flushOutbox();
        expect(again.sent).toBe(1);
    });

    it('shows nothing while signed out', async () => {
        await m.outbox.enqueue(entry);
        m.outbox.setOutboxOwner(null);
        expect(m.outbox.outboxCount()).toBe(0);
    });
});

describe('idempotency key', () => {
    it('is sent on the first attempt and reused when the item is queued and flushed', async () => {
        fetchMock.mockRejectedValueOnce(new TypeError('offline'));
        await m.sync.submitOrQueue(true, entry);
        const firstKey = fetchMock.mock.calls[0][1].headers['Idempotency-Key'];
        expect(firstKey).toBeTruthy();
        expect(m.outbox.getOutbox()[0].idempotencyKey).toBe(firstKey);

        fetchMock.mockReturnValue(respond(200));
        await m.sync.flushOutbox();
        expect(fetchMock.mock.calls[1][1].headers['Idempotency-Key']).toBe(firstKey);
    });
});
