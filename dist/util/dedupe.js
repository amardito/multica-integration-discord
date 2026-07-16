"use strict";
/**
 * Deduplication and safety helpers for incoming workspace events.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.consoleLogger = exports.noopLogger = exports.EventDeduper = void 0;
/** Simple in-memory LRU-style deduplicator for event IDs. */
class EventDeduper {
    seen = new Set();
    maxSize;
    constructor(maxSize = 1000) {
        if (maxSize <= 0) {
            throw new Error('maxSize must be positive');
        }
        this.maxSize = maxSize;
    }
    /**
     * Check whether an event has been seen. If not, add it to the cache.
     *
     * Events without an id are considered malformed and rejected.
     */
    check(eventId) {
        if (!eventId || typeof eventId !== 'string' || eventId.trim().length === 0) {
            return { ok: false, reason: 'malformed' };
        }
        if (this.seen.has(eventId)) {
            return { ok: false, reason: 'duplicate' };
        }
        this.seen.add(eventId);
        while (this.seen.size > this.maxSize) {
            const first = this.seen.values().next().value;
            if (first !== undefined) {
                this.seen.delete(first);
            }
        }
        return { ok: true };
    }
    size() {
        return this.seen.size;
    }
    clear() {
        this.seen.clear();
    }
}
exports.EventDeduper = EventDeduper;
/** Default no-op logger for tests and minimal environments. */
exports.noopLogger = {
    debug: () => { },
    info: () => { },
    warn: () => { },
    error: () => { },
};
/** Console-based logger for production. */
exports.consoleLogger = {
    debug: (msg, ...args) => console.debug(msg, ...args),
    info: (msg, ...args) => console.info(msg, ...args),
    warn: (msg, ...args) => console.warn(msg, ...args),
    error: (msg, ...args) => console.error(msg, ...args),
};
//# sourceMappingURL=dedupe.js.map