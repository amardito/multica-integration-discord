/**
 * Alert pipeline: validates, deduplicates, formats, and delivers workspace events.
 */

import { WorkspaceEvent, NormalizedAlert } from '../events/types';
import { formatAlert } from '../alerts/formatter';
import { DiscordDelivery, SendResult } from '../delivery/discord';
import { DedupeResult, EventDeduper, Logger, noopLogger } from '../util/dedupe';

export interface AlertPipelineConfig {
  delivery: DiscordDelivery;
  deduper?: EventDeduper;
  logger?: Logger;
}

export interface PipelineResult {
  /** Stable id for the incoming event, used for deduplication. */
  eventId?: string;
  deduped?: DedupeResult;
  formatted?: boolean;
  sent?: SendResult;
}

export class AlertPipeline {
  private readonly delivery: DiscordDelivery;
  private readonly deduper: EventDeduper;
  private readonly logger: Logger;

  constructor(config: AlertPipelineConfig) {
    this.delivery = config.delivery;
    this.deduper = config.deduper ?? new EventDeduper();
    this.logger = config.logger ?? noopLogger;
  }

  /**
   * Handle a raw workspace event.
   *
   * The pipeline never throws; all failures are logged and returned so the bot
   * stays up even when Discord is unreachable or events are malformed.
   */
  async handle(event: WorkspaceEvent, eventId?: string): Promise<PipelineResult> {
    const result: PipelineResult = {};

    if (eventId) {
      result.eventId = eventId;
      const deduped = this.deduper.check(eventId);
      result.deduped = deduped;
      if (!deduped.ok) {
        this.logger.warn('event dropped by deduplicator', { eventId, reason: deduped.reason });
        return result;
      }
    }

    const formatted = formatAlert(event);
    if (!formatted.ok) {
      result.formatted = false;
      this.logger.warn('event dropped by formatter', { eventId, error: formatted.error });
      return result;
    }

    result.formatted = true;
    const sent = await this.delivery.send(formatted.alert);
    result.sent = sent;

    if (!sent.ok) {
      this.logger.error('discord delivery failed', { eventId, error: sent.error });
    } else {
      this.logger.info('discord alert delivered', { eventId, category: formatted.alert.category });
    }

    return result;
  }

  /**
   * Synchronously format an event without delivering it. Useful for testing or
   * previewing alerts.
   */
  preview(event: WorkspaceEvent): NormalizedAlert | null {
    const formatted = formatAlert(event);
    if (!formatted.ok) return null;
    return formatted.alert;
  }
}

export { WorkspaceEvent, NormalizedAlert };
