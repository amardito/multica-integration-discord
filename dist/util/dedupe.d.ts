/**
 * Deduplication and safety helpers for incoming workspace events.
 */
export interface DedupeResult {
    ok: boolean;
    reason?: 'duplicate' | 'malformed';
}
/** Simple in-memory LRU-style deduplicator for event IDs. */
export declare class EventDeduper {
    private readonly seen;
    private readonly maxSize;
    constructor(maxSize?: number);
    /**
     * Check whether an event has been seen. If not, add it to the cache.
     *
     * Events without an id are considered malformed and rejected.
     */
    check(eventId: string | undefined): DedupeResult;
    size(): number;
    clear(): void;
}
/** Simple logger interface so callers can inject their own logger. */
export interface Logger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}
/** Default no-op logger for tests and minimal environments. */
export declare const noopLogger: Logger;
/** Console-based logger for production. */
export declare const consoleLogger: Logger;
//# sourceMappingURL=dedupe.d.ts.map