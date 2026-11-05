import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Offline outbox — a durable FIFO queue of field mutations (check-in,
 * check-out, canvass visits, activity logs) made while the device has no
 * connection. Items are persisted to AsyncStorage so they survive an app
 * restart, and flushed in order once the network returns (see sync.ts).
 */

export type OutboxKind = 'checkin' | 'checkout' | 'visit' | 'activity';

export type OutboxItem = {
    id: string;
    kind: OutboxKind;
    /** Human label shown in the sync UI, e.g. "Check-in" or "Visit · Toko Maju". */
    label: string;
    method: 'POST';
    path: string;
    body: unknown;
    createdAt: number;
};

const STORAGE_KEY = 'permana_outbox_v1';

let items: OutboxItem[] = [];
let loaded = false;
const listeners = new Set<(items: OutboxItem[]) => void>();

function emit() {
    for (const fn of listeners) fn(items);
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

export function getOutbox(): OutboxItem[] {
    return items;
}

export function outboxCount(): number {
    return items.length;
}

/** Subscribe to queue changes; returns an unsubscribe fn. Fires immediately. */
export function subscribeOutbox(fn: (items: OutboxItem[]) => void): () => void {
    listeners.add(fn);
    fn(items);
    return () => listeners.delete(fn);
}

export async function enqueue(
    entry: Omit<OutboxItem, 'id' | 'createdAt' | 'method'>,
): Promise<OutboxItem> {
    const item: OutboxItem = {
        ...entry,
        method: 'POST',
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
