/**
 * Deduplication and safety helpers for incoming workspace events.
 */

export interface DedupeResult {
  ok: boolean;
  reason?: 'duplicate' | 'malformed';
}

/** Simple in-memory LRU-style deduplicator for event IDs. */
export class EventDeduper {
  private readonly seen: Set<string> = new Set();
  private readonly maxSize: number;

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
  check(eventId: string | undefined): DedupeResult {
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

  size(): number {
    return this.seen.size;
  }

  clear(): void {
    this.seen.clear();
  }
}

/** Simple logger interface so callers can inject their own logger. */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/** Default no-op logger for tests and minimal environments. */
export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/** Console-based logger for production. */
export const consoleLogger: Logger = {
  debug: (msg, ...args) => console.debug(msg, ...args),
  info: (msg, ...args) => console.info(msg, ...args),
  warn: (msg, ...args) => console.warn(msg, ...args),
  error: (msg, ...args) => console.error(msg, ...args),
};
