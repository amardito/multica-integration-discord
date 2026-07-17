import {
  WorkspaceEvent,
  EventCategory,
  EventSeverity,
} from '../events/types';

export interface InboxNotification {
  id: string;
  workspace_id: string;
  recipient_type: string;
  recipient_id: string;
  type: string;
  severity: string;
  issue_id: string;
  title: string;
  body: string;
  read: boolean;
  archived: boolean;
  created_at: string;
  issue_status: string;
  actor_type: string;
  actor_id: string;
  details: string;
}

export interface InboxResponse {
  items: InboxNotification[];
  count: number;
}

export interface MulticaInboxSourceConfig {
  baseUrl: string;
  apiToken: string;
  workspaceId: string;
  limit?: number;
  unreadOnly?: boolean;
}

export class MulticaInboxSource {
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly workspaceId: string;
  private readonly limit: number;
  private readonly unreadOnly: boolean;

  constructor(config: MulticaInboxSourceConfig) {
    if (!config.baseUrl) {
      throw new Error('MulticaInboxSource requires baseUrl');
    }
    if (!config.apiToken) {
      throw new Error('MulticaInboxSource requires apiToken');
    }
    if (!config.workspaceId) {
      throw new Error('MulticaInboxSource requires workspaceId');
    }

    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiToken = config.apiToken;
    this.workspaceId = config.workspaceId;
    this.limit = config.limit ?? 50;
    this.unreadOnly = config.unreadOnly ?? true;
  }

  async poll(): Promise<WorkspaceEvent[]> {
    const url = new URL(`${this.baseUrl}/api/inbox`);
    url.searchParams.set('limit', String(this.limit));
    if (this.unreadOnly) {
      url.searchParams.set('unread_only', 'true');
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'X-Workspace-ID': this.workspaceId,
      },
    });

    if (!response.ok) {
      throw new Error(`Multica API error: ${response.status} ${response.statusText}`);
    }

    const data = normalizeInboxResponse(await response.json());
    return data.items.map((item) => mapNotificationToWorkspaceEvent(item));
  }
}

const CATEGORY_MAP: Record<string, EventCategory> = {
  new_comment: 'comment',
  mentioned: 'comment',
  status_changed: 'issue',
  assigned: 'issue',
  unassigned: 'issue',
  priority_changed: 'issue',
  new_issue: 'issue',
  issue_created: 'issue',
  issue_updated: 'issue',
  agent_mentioned: 'agent',
  runtime_offline: 'runtime',
  runtime_online: 'runtime',
  autopilot_triggered: 'autopilot',
  pr_ci_failed: 'pr_ci',
  pr_ci_succeeded: 'pr_ci',
  system_error: 'system_error',
};

const ACTION_MAP: Record<string, string> = {
  new_comment: 'comment added',
  mentioned: 'mentioned',
  status_changed: 'status changed',
  assigned: 'assigned',
  unassigned: 'unassigned',
  priority_changed: 'priority changed',
  new_issue: 'created',
  issue_created: 'created',
  issue_updated: 'updated',
  agent_mentioned: 'mentioned',
  runtime_offline: 'offline',
  runtime_online: 'online',
  autopilot_triggered: 'triggered',
  pr_ci_failed: 'failed',
  pr_ci_succeeded: 'succeeded',
  system_error: 'reported',
};

const SEVERITY_SET: Set<EventSeverity> = new Set(['critical', 'warning', 'info']);

export function mapNotificationToWorkspaceEvent(notification: InboxNotification): WorkspaceEvent {
  const category = CATEGORY_MAP[notification.type] ?? 'issue';
  const action = ACTION_MAP[notification.type] ?? notification.type;
  const severity = SEVERITY_SET.has(notification.severity as EventSeverity)
    ? (notification.severity as EventSeverity)
    : undefined;

  return {
    category,
    action,
    severity,
    entityId: notification.issue_id,
    entityName: notification.title,
    actorId: notification.actor_id,
    actorName: notification.actor_type,
    details: notification.body || notification.details,
    timestamp: notification.created_at,
    metadata: {
      notificationId: notification.id,
      notificationType: notification.type,
      issueStatus: notification.issue_status,
      read: notification.read,
    },
  };
}

export function normalizeInboxResponse(data: unknown): InboxResponse {
  if (!data || typeof data !== 'object') {
    return { items: [], count: 0 };
  }
  const response = data as Partial<InboxResponse>;
  const items = Array.isArray(response.items) ? response.items : [];
  return { items, count: items.length };
}
