import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Offline outbox — a durable FIFO queue of field mutations (check-in,
 * check-out, canvass visits, activity logs) made while the device has no
 * connection. Items are persisted to AsyncStorage so they survive an app
 * restart, and flushed in order once the network returns (see sync.ts).
 */

export type OutboxKind = 'checkin' | 'checkout' | 'visit' | 'activity' | 'lead';

export type OutboxItem = {
    id: string;
    kind: OutboxKind;
    /** Human label shown in the sync UI, e.g. "Check-in" or "Visit · Toko Maju". */
    label: string;
    method: 'POST';
    path: string;
    body: unknown;
    createdAt: number;
    /** Account that made the change; it is only ever sent under this account. */
    ownerId?: number;
    /** Sent as `Idempotency-Key` so a backend can ignore a duplicate delivery. */
    idempotencyKey?: string;
};

/** A fresh key for one logical mutation (reused across retries of that mutation). */
export function newIdempotencyKey(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const STORAGE_KEY = 'permana_outbox_v1';

let items: OutboxItem[] = [];
let loaded = false;
let owner: number | null = null;
const listeners = new Set<(items: OutboxItem[]) => void>();

/**
 * Items belonging to the signed-in account. Items queued by another account stay
 * on disk untouched until that account signs in again. (Items from before
 * ownership was recorded have no owner and belong to whoever is signed in.)
 */
function own(): OutboxItem[] {
    if (owner === null) return [];
    return items.filter((i) => i.ownerId === undefined || i.ownerId === owner);
}

function emit() {
    const mine = own();
    for (const fn of listeners) fn(mine);
}

/** Set (or clear) the account the queue currently acts for. */
export function setOutboxOwner(id: number | null): void {
    owner = id;
    emit();
}

async function persist() {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
        // Persistence is best-effort; the in-memory queue still flushes this session.
    }
}

/** Load the queue from storage once at startup. */
export async function loadOutbox(): Promise<OutboxItem[]> {
    if (loaded) return items;
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        items = raw ? (JSON.parse(raw) as OutboxItem[]) : [];
    } catch {
        items = [];
    }
    loaded = true;
    emit();
    return items;
}

/** The signed-in account's queued items, oldest first. */
export function getOutbox(): OutboxItem[] {
    return own();
}

export function outboxCount(): number {
    return own().length;
}

/** Subscribe to queue changes; returns an unsubscribe fn. Fires immediately. */
export function subscribeOutbox(fn: (items: OutboxItem[]) => void): () => void {
    listeners.add(fn);
    fn(own());
    return () => listeners.delete(fn);
}

export async function enqueue(
    entry: Omit<OutboxItem, 'id' | 'createdAt' | 'method' | 'ownerId'>,
): Promise<OutboxItem> {
    const item: OutboxItem = {
        ...entry,
        method: 'POST',
        ownerId: owner ?? undefined,
        idempotencyKey: entry.idempotencyKey ?? newIdempotencyKey(),
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
    };
    items = [...items, item];
    emit();
    await persist();
    return item;
}

export async function removeFromOutbox(id: string): Promise<void> {
    items = items.filter((i) => i.id !== id);
    emit();
    await persist();
}
