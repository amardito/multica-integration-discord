import { WorkspaceEvent, EventCategory, EventSeverity, FormatAlertResult } from '../events/types';
/** Thrown/returned when an event cannot be formatted safely. */
export declare class FormattingError extends Error {
    constructor(message: string);
}
declare function validateEvent(event: unknown): event is WorkspaceEvent;
declare function resolveSeverity(event: WorkspaceEvent): EventSeverity;
declare function formatTitle(category: EventCategory, action: string, severity: EventSeverity): string;
declare function truncate(value: string, max: number): string;
declare function formatBody(event: WorkspaceEvent): string;
declare function formatFooter(event: WorkspaceEvent): string;
/**
 * Transform a normalized workspace event into a Discord-ready alert.
 *
 * Invalid or malformed events are returned as a non-throwing error result so
 * callers can log and drop them without crashing the bot.
 */
export declare function formatAlert(event: WorkspaceEvent): FormatAlertResult;
export { validateEvent, resolveSeverity, formatTitle, formatBody, formatFooter, truncate };
//# sourceMappingURL=formatter.d.ts.map