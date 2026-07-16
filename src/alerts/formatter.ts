import {
  WorkspaceEvent,
  EventCategory,
  EventSeverity,
  NormalizedAlert,
  FormatAlertResult,
  DEFAULT_SEVERITY,
  SEVERITY_EMOJI,
  MAX_BODY_LENGTH,
  MAX_FOOTER_LENGTH,
} from '../events/types';

/** Thrown/returned when an event cannot be formatted safely. */
export class FormattingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormattingError';
  }
}

function validateEvent(event: unknown): event is WorkspaceEvent {
  if (!event || typeof event !== 'object') return false;
  const e = event as Partial<WorkspaceEvent>;
  if (!e.category || !Object.prototype.hasOwnProperty.call(DEFAULT_SEVERITY, e.category)) {
    return false;
  }
  if (!e.action || typeof e.action !== 'string') return false;
  if (!e.entityId || typeof e.entityId !== 'string') return false;
  return true;
}

function resolveSeverity(event: WorkspaceEvent): EventSeverity {
  if (event.severity && Object.prototype.hasOwnProperty.call(SEVERITY_EMOJI, event.severity)) {
    return event.severity;
  }
  return DEFAULT_SEVERITY[event.category];
}

function formatTitle(category: EventCategory, action: string, severity: EventSeverity): string {
  const emoji = SEVERITY_EMOJI[severity];
  const categoryLabel = category.toUpperCase().replace(/_/g, ' ');
  return `${emoji} [${categoryLabel}] ${action}`;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function formatBody(event: WorkspaceEvent): string {
  const lines: string[] = [];

  if (event.entityName) {
    lines.push(`**Entity:** ${event.entityName} (\`${event.entityId}\`)`);
  } else {
    lines.push(`**Entity:** \`${event.entityId}\``);
  }

  if (event.actorName) {
    lines.push(`**Actor:** ${event.actorName}${event.actorId ? ` (\`${event.actorId}\`)` : ''}`);
  } else if (event.actorId) {
    lines.push(`**Actor:** \`${event.actorId}\``);
  }

  if (event.projectName) {
    lines.push(`**Project:** ${event.projectName}${event.projectId ? ` (\`${event.projectId}\`)` : ''}`);
  } else if (event.projectId) {
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

  return truncate(lines.join('\n'), MAX_BODY_LENGTH);
}

function formatFooter(event: WorkspaceEvent): string {
  const parts: string[] = [];
  parts.push(`category=${event.category}`);
  if (event.timestamp) {
    parts.push(`ts=${event.timestamp}`);
  }
  return truncate(parts.join(' · '), MAX_FOOTER_LENGTH);
}

/**
 * Transform a normalized workspace event into a Discord-ready alert.
 *
 * Invalid or malformed events are returned as a non-throwing error result so
 * callers can log and drop them without crashing the bot.
 */
export function formatAlert(event: WorkspaceEvent): FormatAlertResult {
  if (!validateEvent(event)) {
    return { ok: false, error: 'malformed or unsupported event' };
  }

  const severity = resolveSeverity(event);
  const alert: NormalizedAlert = {
    severity,
    category: event.category,
    title: formatTitle(event.category, event.action, severity),
    body: formatBody(event),
    footer: formatFooter(event),
  };

  return { ok: true, alert };
}

export { validateEvent, resolveSeverity, formatTitle, formatBody, formatFooter, truncate };
