import { Alert } from 'react-native';
import { ApiError, apiFetch, hasAuthToken, isTransientError } from '../api/client';
import { enqueue, getOutbox, loadOutbox, removeFromOutbox, type OutboxKind } from './outbox';

/**
 * Queue only when a retry can succeed: no connectivity, or a temporary server
 * condition. A definitive ApiError (validation / business rule) means the same
 * payload would fail again, so it propagates to the caller instead.
 */
const isConnectivityError = isTransientError;

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

/** A 4xx the server will keep returning for this payload (not auth/rate-limit/timeout). */
function isDefinitiveRejection(e: unknown): e is ApiError {
    return (
        e instanceof ApiError &&
        e.status >= 400 &&
        e.status < 500 &&
        ![401, 408, 429].includes(e.status)
    );
}

let flushing = false;

export type FlushResult = { sent: number; dropped: number; remaining: number };

/** Labels of items the server definitively rejected during the last flush. */
export type DroppedItem = { label: string; message: string };

/**
 * Flush the outbox oldest-first. Stops at the first transient failure (offline,
 * 5xx, expired session) and leaves the rest queued. Drops only items the server
 * definitively rejects with a 4xx (validation / business rules), since re-sending the same
 * payload cannot succeed.
 */
export async function flushOutbox(): Promise<FlushResult & { droppedItems: DroppedItem[] }> {
    const idle = { sent: 0, dropped: 0, remaining: getOutbox().length, droppedItems: [] };
    // Nothing to send under, or already running. Without a session a flush
    // would just 401, so wait until the user is signed in.
    if (flushing || !hasAuthToken()) return idle;
    await loadOutbox(); // make sure persisted items are in memory (no-op once loaded)
    flushing = true;
    let sent = 0;
    let dropped = 0;
    const droppedItems: DroppedItem[] = [];
    try {
        // Snapshot ids in order; the queue may change under us between awaits.
        for (const item of [...getOutbox()]) {
            try {
                await apiFetch(item.path, { method: item.method, body: item.body });
                await removeFromOutbox(item.id);
                sent += 1;
            } catch (e) {
                if (isDefinitiveRejection(e)) {
                    // Server reached and definitively rejected — drop so the
                    // queue can drain, and report it so the user isn't left guessing.
                    await removeFromOutbox(item.id);
                    dropped += 1;
                    droppedItems.push({ label: item.label, message: e.firstError() ?? e.message });
                    continue;
                }
                // Offline, temporary server trouble or an expired session (401):
                // stop and keep everything queued for the next attempt.
                break;
            }
        }
    } finally {
        flushing = false;
    }
    return { sent, dropped, remaining: getOutbox().length, droppedItems };
}

/** Flush the queue and tell the user about anything the server rejected. */
export async function flushAndReport(): Promise<void> {
    const { droppedItems } = await flushOutbox();
    if (droppedItems.length === 0) return;
    Alert.alert(
        'Some items couldn’t be synced',
        droppedItems.map((d) => `• ${d.label}: ${d.message}`).join('\n'),
    );
}
