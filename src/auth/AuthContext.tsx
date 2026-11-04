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
import { apiFetch, setAuthToken } from '../api/client';
import { DEVICE_NAME } from '../config';
import type { LoginResponse, Single, User } from '../types/api';

const TOKEN_KEY = 'permana_token';

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

    // On launch, restore a saved token and re-hydrate the user from /me.
    useEffect(() => {
        (async () => {
            try {
                const token = await SecureStore.getItemAsync(TOKEN_KEY);
                if (token) {
                    setAuthToken(token);
                    const me = await apiFetch<Single<User>>('/me');
                    setUser(me.data);
                }
            } catch {
                // Token invalid/expired or server unreachable — start signed out.
                await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
                setAuthToken(null);
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
    }, []);

    const signOut = useCallback(async () => {
        try {
            await apiFetch('/logout', { method: 'POST' });
        } catch {
            // Even if the server call fails, clear the local session.
        }
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
        setAuthToken(null);
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
