/**
 * Alert pipeline: validates, deduplicates, formats, and delivers workspace events.
 */
import { WorkspaceEvent, NormalizedAlert } from '../events/types';
import { DiscordDelivery, SendResult } from '../delivery/discord';
import { DedupeResult, EventDeduper, Logger } from '../util/dedupe';
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
export declare class AlertPipeline {
    private readonly delivery;
    private readonly deduper;
    private readonly logger;
    constructor(config: AlertPipelineConfig);
    /**
     * Handle a raw workspace event.
     *
     * The pipeline never throws; all failures are logged and returned so the bot
     * stays up even when Discord is unreachable or events are malformed.
     */
    handle(event: WorkspaceEvent, eventId?: string): Promise<PipelineResult>;
    /**
     * Synchronously format an event without delivering it. Useful for testing or
     * previewing alerts.
     */
    preview(event: WorkspaceEvent): NormalizedAlert | null;
}
export { WorkspaceEvent, NormalizedAlert };
//# sourceMappingURL=pipeline.d.ts.map