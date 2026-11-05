import { ApiError, apiFetch } from '../api/client';
import { enqueue, getOutbox, removeFromOutbox, type OutboxKind } from './outbox';

/**
 * A network failure (device offline / server unreachable) throws a plain
 * Error from fetch, never an ApiError. We treat only those as "queue it";
 * an ApiError means the server answered and rejected the request, so retrying
 * the same payload would fail again.
 */
function isConnectivityError(e: unknown): boolean {
    return !(e instanceof ApiError);
}

export type QueueResult<T> = { queued: true } | { queued: false; data: T };

/**
 * Send a mutation now, or queue it for later if the device is offline.
 *
 * - When `online` is false we don't even try — straight to the outbox.
 * - When we try and hit a connectivity error, we queue it.
 * - An ApiError (validation / business rule) propagates to the caller.
 */
export async function submitOrQueue<T>(
    online: boolean,
    entry: { kind: OutboxKind; label: string; path: string; body: unknown },
): Promise<QueueResult<T>> {
    if (!online) {
        await enqueue(entry);
        return { queued: true };
    }
    try {
        const data = await apiFetch<T>(entry.path, { method: 'POST', body: entry.body });
        return { queued: false, data };
    } catch (e) {
        if (isConnectivityError(e)) {
            await enqueue(entry);
            return { queued: true };
        }
        throw e;
    }
}

let flushing = false;

export type FlushResult = { sent: number; dropped: number; remaining: number };

/**
 * Flush the outbox oldest-first. Stops at the first connectivity error (still
 * offline) and leaves the rest queued. Drops items the server rejects with an
 * ApiError, since re-sending the same payload cannot succeed.
 */
export async function flushOutbox(): Promise<FlushResult> {
    if (flushing) return { sent: 0, dropped: 0, remaining: getOutbox().length };
    flushing = true;
    let sent = 0;
    let dropped = 0;
    try {
        // Snapshot ids in order; the queue may change under us between awaits.
        for (const item of [...getOutbox()]) {
            try {
                await apiFetch(item.path, { method: item.method, body: item.body });
                await removeFromOutbox(item.id);
                sent += 1;
            } catch (e) {
                if (e instanceof ApiError) {
                    // Server reached but rejected — drop so the queue can drain.
                    await removeFromOutbox(item.id);
                    dropped += 1;
                    continue;
                }
                // Connectivity gone again — stop and keep the rest.
                break;
            }
        }
    } finally {
        flushing = false;
    }
    return { sent, dropped, remaining: getOutbox().length };
}
