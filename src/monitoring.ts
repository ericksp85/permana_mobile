/**
 * Single place to report unexpected errors. Today it logs; wire a crash
 * reporter (e.g. Sentry) in here and every caller — the error boundary and the
 * global JS error handler — picks it up without further changes.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
    console.error('[app error]', error, context ?? '');
}

/** Report uncaught JS errors that happen outside React rendering (timers, promises). */
export function installGlobalErrorHandler(): void {
    const errorUtils = (globalThis as { ErrorUtils?: {
        getGlobalHandler: () => (e: unknown, isFatal?: boolean) => void;
        setGlobalHandler: (h: (e: unknown, isFatal?: boolean) => void) => void;
    } }).ErrorUtils;
    if (!errorUtils) return;

    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
        reportError(error, { isFatal });
        previous(error, isFatal);
    });
}
