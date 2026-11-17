import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, apiFetch, setAuthToken, setUnauthorizedHandler } from '../api/client';
import { flushAndReport } from '../offline/sync';
import { DEVICE_NAME } from '../config';
import type { LoginResponse, Single, User } from '../types/api';

const TOKEN_KEY = 'permana_token';
/** Last known user, so the app can open offline without re-validating the token. */
const USER_KEY = 'permana_user';

async function cacheUser(user: User | null): Promise<void> {
    try {
        if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        else await AsyncStorage.removeItem(USER_KEY);
    } catch {
        // Best-effort cache.
    }
}

async function readCachedUser(): Promise<User | null> {
    try {
        const raw = await AsyncStorage.getItem(USER_KEY);
        return raw ? (JSON.parse(raw) as User) : null;
    } catch {
        return null;
    }
}

/** Drop the local session (token + cached user). */
async function clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await cacheUser(null);
    setAuthToken(null);
}

type AuthState = {
    /** True until we've checked storage for an existing session. */
    initializing: boolean;
    user: User | null;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [initializing, setInitializing] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    // The server rejected our token mid-session (revoked / expired): sign out.
    useEffect(() => {
        setUnauthorizedHandler(() => {
            void clearSession().then(() => setUser(null));
        });
        return () => setUnauthorizedHandler(null);
    }, []);

    // On launch, restore a saved token and re-hydrate the user from /me.
    useEffect(() => {
        (async () => {
            try {
                const token = await SecureStore.getItemAsync(TOKEN_KEY);
                if (!token) return;
                setAuthToken(token);
                try {
                    const me = await apiFetch<Single<User>>('/me');
                    setUser(me.data);
                    void cacheUser(me.data);
                    void flushAndReport();
                } catch (e) {
                    if (e instanceof ApiError && e.status === 401) {
                        // Token really is invalid — start signed out.
                        await clearSession();
                    } else {
                        // Offline / server trouble: keep the session and use the
                        // last known user so field work can continue offline.
                        const cached = await readCachedUser();
                        if (cached) setUser(cached);
                        else setAuthToken(null);
                    }
                }
            } finally {
                setInitializing(false);
            }
        })();
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        const res = await apiFetch<LoginResponse>('/login', {
            method: 'POST',
            body: { email, password, device_name: DEVICE_NAME },
        });
        await SecureStore.setItemAsync(TOKEN_KEY, res.token);
        setAuthToken(res.token);
        setUser(res.user);
        void cacheUser(res.user);
        void flushAndReport();
    }, []);

    const signOut = useCallback(async () => {
        try {
            await apiFetch('/logout', { method: 'POST' });
        } catch {
            // Even if the server call fails, clear the local session.
        }
        await clearSession();
        setUser(null);
    }, []);

    const value = useMemo<AuthState>(
        () => ({ initializing, user, signIn, signOut }),
        [initializing, user, signIn, signOut],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
