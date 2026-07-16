import {
  WorkspaceEvent,
  DEFAULT_SEVERITY,
  SEVERITY_EMOJI,
} from '../../events/types';
import { formatAlert, FormattingError } from '../formatter';

describe('formatAlert', () => {
  it('formats an issue event with default severity', () => {
    const event: WorkspaceEvent = {
      category: 'issue',
      action: 'created',
      entityId: 'TEL-90',
      entityName: 'Implement workspace alert delivery and formatting',
      projectName: 'multica-integration-discord',
      actorName: 'Antares Backend Engineer',
      details: 'High priority issue assigned.',
      resourceUrl: 'https://example.com/issues/TEL-90',
      timestamp: '2026-07-16T19:15:06Z',
    };

    const result = formatAlert(event);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.category).toBe('issue');
    expect(result.alert.severity).toBe(DEFAULT_SEVERITY.issue);
    expect(result.alert.title).toContain(SEVERITY_EMOJI.warning);
    expect(result.alert.title).toContain('[ISSUE]');
    expect(result.alert.title).toContain('created');
    expect(result.alert.body).toContain('TEL-90');
    expect(result.alert.body).toContain('Implement workspace alert delivery and formatting');
    expect(result.alert.body).toContain('Antares Backend Engineer');
    expect(result.alert.body).toContain('https://example.com/issues/TEL-90');
    expect(result.alert.footer).toContain('category=issue');
    expect(result.alert.footer).toContain('2026-07-16T19:15:06Z');
  });

  it('formats a comment event', () => {
    const event: WorkspaceEvent = {
      category: 'comment',
      action: 'added',
      entityId: 'c-1',
      entityName: 'Final result comment',
      actorName: 'Reviewer Bot',
      details: 'Posted final results.',
      timestamp: '2026-07-16T20:00:00Z',
    };

    const result = formatAlert(event);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.severity).toBe('info');
    expect(result.alert.title).toContain('[COMMENT]');
  });

  it('formats an agent/runtime event', () => {
    const event: WorkspaceEvent = {
      category: 'agent',
      action: 'stopped responding',
      entityId: 'agent-42',
      actorName: 'Antares Backend Engineer',
      details: 'Agent missed three heartbeats.',
    };

    const result = formatAlert(event);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.severity).toBe('warning');
    expect(result.alert.title).toContain('[AGENT]');
    expect(result.alert.title).toContain('stopped responding');
  });

  it('formats a runtime event with critical severity', () => {
    const event: WorkspaceEvent = {
      category: 'runtime',
      action: 'offline',
      entityId: 'runtime-7',
      details: 'Daemon has not claimed tasks for 5 minutes.',
    };

    const result = formatAlert(event);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.severity).toBe('critical');
    expect(result.alert.title).toContain('🔴');
    expect(result.alert.title).toContain('[RUNTIME]');
  });

  it('formats an autopilot event', () => {
    const event: WorkspaceEvent = {
      category: 'autopilot',
      action: 'triggered',
      entityId: 'ap-1',
      entityName: 'Nightly sync',
      actorName: 'Scheduler',
      details: 'Autopilot created 3 issues.',
    };

    const result = formatAlert(event);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.severity).toBe('warning');
    expect(result.alert.title).toContain('[AUTOPILOT]');
  });

  it('formats a PR/CI event', () => {
    const event: WorkspaceEvent = {
      category: 'pr_ci',
      action: 'failed',
      entityId: 'pr-12',
      entityName: 'Add alert pipeline',
      actorName: 'CI Bot',
      details: 'Unit tests failed on Node 18.',
      resourceUrl: 'https://github.com/amardito/multica-integration-discord/pull/12',
    };

    const result = formatAlert(event);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.severity).toBe('info');
    expect(result.alert.title).toContain('[PR CI]');
    expect(result.alert.body).toContain('github.com/amardito/multica-integration-discord/pull/12');
  });

  it('formats a system error event', () => {
    const event: WorkspaceEvent = {
      category: 'system_error',
      action: 'unhandled exception',
      entityId: 'err-99',
      details: 'Database connection pool exhausted.',
    };

    const result = formatAlert(event);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.severity).toBe('critical');
    expect(result.alert.title).toContain('🔴');
    expect(result.alert.title).toContain('[SYSTEM ERROR]');
  });

  it('uses explicit severity when provided', () => {
    const event: WorkspaceEvent = {
      category: 'issue',
      severity: 'critical',
      action: 'deleted',
      entityId: 'TEL-1',
    };

    const result = formatAlert(event);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.severity).toBe('critical');
    expect(result.alert.title).toContain('🔴');
  });

  it('falls back to default severity when explicit severity is invalid', () => {
    const event = {
      category: 'issue',
      severity: 'unknown',
      action: 'updated',
      entityId: 'TEL-2',
    } as unknown as WorkspaceEvent;

    const result = formatAlert(event);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.severity).toBe(DEFAULT_SEVERITY.issue);
  });

  it('returns an error for malformed events', () => {
    const result = formatAlert({ category: 'unknown', action: 'x', entityId: '1' } as unknown as WorkspaceEvent);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('malformed');
  });

  it('returns an error for events with missing fields', () => {
    const result = formatAlert({ category: 'issue' } as WorkspaceEvent);
    expect(result.ok).toBe(false);
  });

  it('truncates long bodies', () => {
    const event: WorkspaceEvent = {
      category: 'system_error',
      action: 'reported',
      entityId: 'err-big',
      details: 'x'.repeat(3000),
    };

    const result = formatAlert(event);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.alert.body.length).toBeLessThanOrEqual(1800);
    expect(result.alert.body.endsWith('...')).toBe(true);
  });
});
