import NetInfo from '@react-native-community/netinfo';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { loadOutbox, subscribeOutbox } from './outbox';
import { flushOutbox } from './sync';

type OfflineValue = {
    /** Best-known connectivity; optimistic (true) until NetInfo says otherwise. */
    online: boolean;
    /** Number of mutations waiting to sync. */
    pending: number;
    /** Attempt to flush the queue now. */
    sync: () => void;
};

const OfflineContext = createContext<OfflineValue | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
    const [online, setOnline] = useState(true);
    const [pending, setPending] = useState(0);
    const onlineRef = useRef(true);

    const sync = useCallback(() => {
        if (!onlineRef.current) return;
        void flushOutbox();
    }, []);

    useEffect(() => {
        void loadOutbox();
        const unsubOutbox = subscribeOutbox((items) => setPending(items.length));

        const unsubNet = NetInfo.addEventListener((state) => {
            // reachability can be null (unknown) early on — treat null as online.
            const next = state.isConnected !== false && state.isInternetReachable !== false;
            const was = onlineRef.current;
            onlineRef.current = next;
            setOnline(next);
            if (next && !was) void flushOutbox(); // just came back online
        });

        const appSub = AppState.addEventListener('change', (s) => {
            if (s === 'active' && onlineRef.current) void flushOutbox();
        });

        return () => {
            unsubOutbox();
            unsubNet();
            appSub.remove();
        };
    }, []);

    const value = useMemo<OfflineValue>(() => ({ online, pending, sync }), [online, pending, sync]);
    return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline(): OfflineValue {
    const ctx = useContext(OfflineContext);
    if (!ctx) throw new Error('useOffline must be used within an OfflineProvider');
    return ctx;
}
