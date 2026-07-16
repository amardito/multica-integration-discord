import { WorkspaceEvent, NormalizedAlert } from '../../events/types';
import { AlertPipeline } from '../pipeline';
import { DiscordDelivery, DiscordTransport, SendResult } from '../../delivery/discord';
import { EventDeduper, Logger, noopLogger } from '../../util/dedupe';

function makeTransport(results: SendResult[]): { transport: DiscordTransport; calls: string[] } {
  let index = 0;
  const calls: string[] = [];
  const transport: DiscordTransport = {
    async send(message: string): Promise<SendResult> {
      calls.push(message);
      const result = results[index] ?? { ok: true };
      index += 1;
      return result;
    },
  };
  return { transport, calls };
}

function makeLogger(): { logger: Logger; logs: { level: string; message: string; meta?: unknown }[] } {
  const logs: { level: string; message: string; meta?: unknown }[] = [];
  const logger: Logger = {
    debug: (msg, ...args) => logs.push({ level: 'debug', message: msg, meta: args }),
    info: (msg, ...args) => logs.push({ level: 'info', message: msg, meta: args }),
    warn: (msg, ...args) => logs.push({ level: 'warn', message: msg, meta: args }),
    error: (msg, ...args) => logs.push({ level: 'error', message: msg, meta: args }),
  };
  return { logger, logs };
}

function sampleIssueEvent(): WorkspaceEvent {
  return {
    category: 'issue',
    action: 'created',
    entityId: 'TEL-90',
    entityName: 'Implement workspace alert delivery and formatting',
    actorName: 'Antares Backend Engineer',
    details: 'High priority issue assigned.',
  };
}

describe('AlertPipeline', () => {
  it('formats and delivers an event', async () => {
    const { transport, calls } = makeTransport([{ ok: true }]);
    const { logger, logs } = makeLogger();
    const pipeline = new AlertPipeline({
      delivery: new DiscordDelivery({ transport }),
      logger,
    });

    const result = await pipeline.handle(sampleIssueEvent(), 'evt-1');

    expect(result.deduped?.ok).toBe(true);
    expect(result.formatted).toBe(true);
    expect(result.sent?.ok).toBe(true);
    expect(calls.length).toBe(1);
    expect(calls[0]).toContain('TEL-90');
    expect(logs.some((l) => l.level === 'info' && l.message === 'discord alert delivered')).toBe(true);
  });

  it('deduplicates repeated events', async () => {
    const { transport, calls } = makeTransport([{ ok: true }]);
    const { logger, logs } = makeLogger();
    const pipeline = new AlertPipeline({
      delivery: new DiscordDelivery({ transport }),
      logger,
    });

    await pipeline.handle(sampleIssueEvent(), 'evt-1');
    const result = await pipeline.handle(sampleIssueEvent(), 'evt-1');

    expect(result.deduped?.ok).toBe(false);
    expect(result.deduped?.reason).toBe('duplicate');
    expect(calls.length).toBe(1);
    expect(logs.some((l) => l.level === 'warn' && l.message === 'event dropped by deduplicator')).toBe(true);
  });

  it('drops malformed events and logs a warning', async () => {
    const { transport, calls } = makeTransport([]);
    const { logger, logs } = makeLogger();
    const pipeline = new AlertPipeline({
      delivery: new DiscordDelivery({ transport }),
      logger,
    });

    const result = await pipeline.handle({ category: 'issue' } as WorkspaceEvent, 'evt-2');

    expect(result.formatted).toBe(false);
    expect(calls.length).toBe(0);
    expect(logs.some((l) => l.level === 'warn' && l.message === 'event dropped by formatter')).toBe(true);
  });

  it('logs delivery failures without throwing', async () => {
    const { transport, calls } = makeTransport([{ ok: false, error: 'rate limited' }]);
    const { logger, logs } = makeLogger();
    const pipeline = new AlertPipeline({
      delivery: new DiscordDelivery({ transport }),
      logger,
    });

    const result = await pipeline.handle(sampleIssueEvent(), 'evt-3');

    expect(result.sent?.ok).toBe(false);
    if (result.sent?.ok) return;
    expect(result.sent?.error).toBe('rate limited');
    expect(logs.some((l) => l.level === 'error' && l.message === 'discord delivery failed')).toBe(true);
  });

  it('can preview an alert without delivering', () => {
    const { transport } = makeTransport([]);
    const pipeline = new AlertPipeline({
      delivery: new DiscordDelivery({ transport }),
    });

    const alert = pipeline.preview(sampleIssueEvent());
    expect(alert).not.toBeNull();
    expect(alert?.category).toBe('issue');
  });

  it('returns null for invalid preview events', () => {
    const { transport } = makeTransport([]);
    const pipeline = new AlertPipeline({
      delivery: new DiscordDelivery({ transport }),
    });

    const alert = pipeline.preview({ category: 'issue' } as WorkspaceEvent);
    expect(alert).toBeNull();
  });
});
