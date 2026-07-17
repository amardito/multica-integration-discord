import {
  InboxNotification,
  MulticaInboxSource,
  mapNotificationToWorkspaceEvent,
  normalizeInboxResponse,
} from '../multica';
import { AlertPipeline } from '../../alerts/pipeline';
import { DiscordDelivery } from '../../delivery/discord';

function sampleNotification(overrides: Partial<InboxNotification> = {}): InboxNotification {
  return {
    id: 'notif-1',
    workspace_id: 'ws-1',
    recipient_type: 'member',
    recipient_id: 'user-1',
    type: 'new_comment',
    severity: 'info',
    issue_id: 'TEL-1',
    title: 'Sample issue',
    body: 'A comment was added.',
    read: false,
    archived: false,
    created_at: '2026-07-17T00:00:00Z',
    issue_status: 'in_progress',
    actor_type: 'agent',
    actor_id: 'agent-1',
    details: 'Details here',
    ...overrides,
  };
}

describe('MulticaInboxSource', () => {
  const baseConfig = {
    baseUrl: 'https://multica.example.com',
    apiToken: 'token',
    workspaceId: 'ws-1',
  };

  it('polls /api/inbox with bearer auth and X-Workspace-ID', async () => {
    const notification = sampleNotification();
    const source = new MulticaInboxSource({ ...baseConfig, limit: 5 });

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ items: [notification], count: 1 }),
    } as Response);

    const events = await source.poll();

    expect(events).toHaveLength(1);
    expect(events[0].category).toBe('comment');
    expect(events[0].action).toBe('comment added');
    expect(events[0].entityId).toBe('TEL-1');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://multica.example.com/api/inbox?limit=5&unread_only=true',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          'X-Workspace-ID': 'ws-1',
        }),
      })
    );

    fetchSpy.mockRestore();
  });

  it('does not call the workspace events route', async () => {
    const source = new MulticaInboxSource(baseConfig);
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ items: [], count: 0 }),
    } as Response);

    await source.poll();

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('/api/workspaces/');
    expect(calledUrl).toContain('/api/inbox');
    fetchSpy.mockRestore();
  });

  it('throws on API errors without exposing the token', async () => {
    const source = new MulticaInboxSource(baseConfig);
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
    } as Response);

    await expect(source.poll()).rejects.toThrow('Multica API error: 404 Not Found');
  });

  it('handles empty inbox responses', async () => {
    const source = new MulticaInboxSource(baseConfig);
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ items: [], count: 0 }),
    } as Response);

    const events = await source.poll();
    expect(events).toHaveLength(0);
  });

  it('requires baseUrl, apiToken, and workspaceId', () => {
    expect(() => new MulticaInboxSource({ ...baseConfig, baseUrl: '' })).toThrow('baseUrl');
    expect(() => new MulticaInboxSource({ ...baseConfig, apiToken: '' })).toThrow('apiToken');
    expect(() => new MulticaInboxSource({ ...baseConfig, workspaceId: '' })).toThrow('workspaceId');
  });
});

describe('mapNotificationToWorkspaceEvent', () => {
  it('maps a new_comment notification to a comment event', () => {
    const event = mapNotificationToWorkspaceEvent(sampleNotification({ type: 'new_comment' }));
    expect(event.category).toBe('comment');
    expect(event.action).toBe('comment added');
    expect(event.severity).toBe('info');
    expect(event.entityId).toBe('TEL-1');
    expect(event.entityName).toBe('Sample issue');
    expect(event.actorId).toBe('agent-1');
    expect(event.actorName).toBe('agent');
    expect(event.details).toBe('A comment was added.');
    expect(event.timestamp).toBe('2026-07-17T00:00:00Z');
    expect(event.metadata).toMatchObject({ notificationId: 'notif-1', notificationType: 'new_comment' });
  });

  it('maps status_changed to an issue event', () => {
    const event = mapNotificationToWorkspaceEvent(sampleNotification({ type: 'status_changed', severity: 'warning' }));
    expect(event.category).toBe('issue');
    expect(event.action).toBe('status changed');
    expect(event.severity).toBe('warning');
  });

  it('defaults unknown notification types to issue category', () => {
    const event = mapNotificationToWorkspaceEvent(sampleNotification({ type: 'unknown_type' }));
    expect(event.category).toBe('issue');
    expect(event.action).toBe('unknown_type');
  });

  it('falls back to details when body is empty', () => {
    const event = mapNotificationToWorkspaceEvent(sampleNotification({ body: '', details: 'fallback details' }));
    expect(event.details).toBe('fallback details');
  });

  it('ignores invalid severities', () => {
    const event = mapNotificationToWorkspaceEvent(sampleNotification({ severity: 'extreme' }));
    expect(event.severity).toBeUndefined();
  });
});

describe('normalizeInboxResponse', () => {
  it('returns items and count from a valid response', () => {
    const response = normalizeInboxResponse({ items: [sampleNotification()], count: 1 });
    expect(response.items).toHaveLength(1);
    expect(response.count).toBe(1);
  });

  it('returns empty response for null data', () => {
    const response = normalizeInboxResponse(null);
    expect(response.items).toHaveLength(0);
    expect(response.count).toBe(0);
  });

  it('defaults count to items length when missing', () => {
    const response = normalizeInboxResponse({ items: [sampleNotification()] });
    expect(response.count).toBe(1);
  });

  it('gracefully handles non-array items', () => {
    const response = normalizeInboxResponse({ items: 'not-an-array', count: 5 } as unknown);
    expect(response.items).toEqual([]);
    expect(response.count).toBe(0);
  });
});

describe('inbox-to-discord integration', () => {
  it('deduplicates repeated notification ids through the pipeline', async () => {
    const sentMessages: string[] = [];

    const source = new MulticaInboxSource({
      baseUrl: 'https://multica.example.com',
      apiToken: 'token',
      workspaceId: 'ws-1',
    });

    const delivery = new DiscordDelivery({
      transport: {
        async send(message: string) {
          sentMessages.push(message);
          return { ok: true as const };
        },
      },
    });

    jest.spyOn(global, 'fetch').mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ items: [sampleNotification({ id: 'notif-1' })], count: 1 }),
      } as Response);
    });

    const pipeline = new AlertPipeline({ delivery });
    const firstPoll = await source.poll();
    const secondPoll = await source.poll();

    await pipeline.handle(firstPoll[0], firstPoll[0].metadata?.notificationId as string);
    await pipeline.handle(secondPoll[0], secondPoll[0].metadata?.notificationId as string);

    expect(sentMessages).toHaveLength(1);
  });
});

export {};
