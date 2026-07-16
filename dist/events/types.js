"use strict";
/**
 * Normalized workspace event types consumed by the Discord alert formatter.
 *
 * This layer decouples the alert pipeline from Multica API internals.
 * When a concrete event source becomes available, map its payloads into
 * these structures; until then, the formatter and delivery tests exercise
 * the seam directly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_FOOTER_LENGTH = exports.MAX_BODY_LENGTH = exports.SEVERITY_EMOJI = exports.DEFAULT_SEVERITY = void 0;
/** Severity fallback for each category when the event does not provide one. */
exports.DEFAULT_SEVERITY = {
    issue: 'warning',
    comment: 'info',
    agent: 'warning',
    runtime: 'critical',
    autopilot: 'warning',
    pr_ci: 'info',
    system_error: 'critical',
};
/** Emojis used to make severity scannable in a busy channel. */
exports.SEVERITY_EMOJI = {
    critical: '🔴',
    warning: '🟡',
    info: '🔵',
};
/** Maximum length of an alert body before truncation. */
exports.MAX_BODY_LENGTH = 1800;
/** Maximum length of a footer before truncation. */
exports.MAX_FOOTER_LENGTH = 300;
//# sourceMappingURL=types.js.map