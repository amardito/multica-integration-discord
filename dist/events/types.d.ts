/**
 * Normalized workspace event types consumed by the Discord alert formatter.
 *
 * This layer decouples the alert pipeline from Multica API internals.
 * When a concrete event source becomes available, map its payloads into
 * these structures; until then, the formatter and delivery tests exercise
 * the seam directly.
 */
export type EventSeverity = 'critical' | 'warning' | 'info';
export type EventCategory = 'issue' | 'comment' | 'agent' | 'runtime' | 'autopilot' | 'pr_ci' | 'system_error';
export interface WorkspaceEvent {
    /** Stable category used to select formatting and severity rules. */
    category: EventCategory;
    /** Explicit severity; falls back to category default when absent. */
    severity?: EventSeverity;
    /** Human-readable action, e.g. "created", "failed", "completed". */
    action: string;
    /** Short, stable identifier for the affected entity. */
    entityId: string;
    /** Display name or title for the affected entity. */
    entityName?: string;
    /** Workspace/project context. */
    projectId?: string;
    projectName?: string;
    /** Agent or user context. */
    actorId?: string;
    actorName?: string;
    /** Free-form details appropriate for the channel. */
    details?: string;
    /** Link to the relevant resource in Multica. */
    resourceUrl?: string;
    /** ISO-8601 timestamp when the event occurred. */
    timestamp?: string;
    /** Extra fields for extension without schema changes. */
    metadata?: Record<string, unknown>;
}
export interface NormalizedAlert {
    severity: EventSeverity;
    category: EventCategory;
    title: string;
    body: string;
    footer: string;
}
export interface FormatResult {
    ok: true;
    alert: NormalizedAlert;
}
export interface FormatError {
    ok: false;
    error: string;
}
export type FormatAlertResult = FormatResult | FormatError;
/** Severity fallback for each category when the event does not provide one. */
export declare const DEFAULT_SEVERITY: Record<EventCategory, EventSeverity>;
/** Emojis used to make severity scannable in a busy channel. */
export declare const SEVERITY_EMOJI: Record<EventSeverity, string>;
/** Maximum length of an alert body before truncation. */
export declare const MAX_BODY_LENGTH = 1800;
/** Maximum length of a footer before truncation. */
export declare const MAX_FOOTER_LENGTH = 300;
//# sourceMappingURL=types.d.ts.map