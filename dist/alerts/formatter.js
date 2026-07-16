"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormattingError = void 0;
exports.formatAlert = formatAlert;
exports.validateEvent = validateEvent;
exports.resolveSeverity = resolveSeverity;
exports.formatTitle = formatTitle;
exports.formatBody = formatBody;
exports.formatFooter = formatFooter;
exports.truncate = truncate;
const types_1 = require("../events/types");
/** Thrown/returned when an event cannot be formatted safely. */
class FormattingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FormattingError';
    }
}
exports.FormattingError = FormattingError;
function validateEvent(event) {
    if (!event || typeof event !== 'object')
        return false;
    const e = event;
    if (!e.category || !Object.prototype.hasOwnProperty.call(types_1.DEFAULT_SEVERITY, e.category)) {
        return false;
    }
    if (!e.action || typeof e.action !== 'string')
        return false;
    if (!e.entityId || typeof e.entityId !== 'string')
        return false;
    return true;
}
function resolveSeverity(event) {
    if (event.severity && Object.prototype.hasOwnProperty.call(types_1.SEVERITY_EMOJI, event.severity)) {
        return event.severity;
    }
    return types_1.DEFAULT_SEVERITY[event.category];
}
function formatTitle(category, action, severity) {
    const emoji = types_1.SEVERITY_EMOJI[severity];
    const categoryLabel = category.toUpperCase().replace(/_/g, ' ');
    return `${emoji} [${categoryLabel}] ${action}`;
}
function truncate(value, max) {
    if (value.length <= max)
        return value;
    return `${value.slice(0, max - 3)}...`;
}
function formatBody(event) {
    const lines = [];
    if (event.entityName) {
        lines.push(`**Entity:** ${event.entityName} (\`${event.entityId}\`)`);
    }
    else {
        lines.push(`**Entity:** \`${event.entityId}\``);
    }
    if (event.actorName) {
        lines.push(`**Actor:** ${event.actorName}${event.actorId ? ` (\`${event.actorId}\`)` : ''}`);
    }
    else if (event.actorId) {
        lines.push(`**Actor:** \`${event.actorId}\``);
    }
    if (event.projectName) {
        lines.push(`**Project:** ${event.projectName}${event.projectId ? ` (\`${event.projectId}\`)` : ''}`);
    }
    else if (event.projectId) {
        lines.push(`**Project:** \`${event.projectId}\``);
    }
    if (event.details) {
        lines.push('');
        lines.push(event.details);
    }
    if (event.resourceUrl) {
        lines.push('');
        lines.push(`**Resource:** <${event.resourceUrl}>`);
    }
    return truncate(lines.join('\n'), types_1.MAX_BODY_LENGTH);
}
function formatFooter(event) {
    const parts = [];
    parts.push(`category=${event.category}`);
    if (event.timestamp) {
        parts.push(`ts=${event.timestamp}`);
    }
    return truncate(parts.join(' · '), types_1.MAX_FOOTER_LENGTH);
}
/**
 * Transform a normalized workspace event into a Discord-ready alert.
 *
 * Invalid or malformed events are returned as a non-throwing error result so
 * callers can log and drop them without crashing the bot.
 */
function formatAlert(event) {
    if (!validateEvent(event)) {
        return { ok: false, error: 'malformed or unsupported event' };
    }
    const severity = resolveSeverity(event);
    const alert = {
        severity,
        category: event.category,
        title: formatTitle(event.category, event.action, severity),
        body: formatBody(event),
        footer: formatFooter(event),
    };
    return { ok: true, alert };
}
//# sourceMappingURL=formatter.js.map