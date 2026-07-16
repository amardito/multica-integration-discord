"use strict";
/**
 * Alert pipeline: validates, deduplicates, formats, and delivers workspace events.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertPipeline = void 0;
const formatter_1 = require("../alerts/formatter");
const dedupe_1 = require("../util/dedupe");
class AlertPipeline {
    delivery;
    deduper;
    logger;
    constructor(config) {
        this.delivery = config.delivery;
        this.deduper = config.deduper ?? new dedupe_1.EventDeduper();
        this.logger = config.logger ?? dedupe_1.noopLogger;
    }
    /**
     * Handle a raw workspace event.
     *
     * The pipeline never throws; all failures are logged and returned so the bot
     * stays up even when Discord is unreachable or events are malformed.
     */
    async handle(event, eventId) {
        const result = {};
        if (eventId) {
            result.eventId = eventId;
            const deduped = this.deduper.check(eventId);
            result.deduped = deduped;
            if (!deduped.ok) {
                this.logger.warn('event dropped by deduplicator', { eventId, reason: deduped.reason });
                return result;
            }
        }
        const formatted = (0, formatter_1.formatAlert)(event);
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
        }
        else {
            this.logger.info('discord alert delivered', { eventId, category: formatted.alert.category });
        }
        return result;
    }
    /**
     * Synchronously format an event without delivering it. Useful for testing or
     * previewing alerts.
     */
    preview(event) {
        const formatted = (0, formatter_1.formatAlert)(event);
        if (!formatted.ok)
            return null;
        return formatted.alert;
    }
}
exports.AlertPipeline = AlertPipeline;
//# sourceMappingURL=pipeline.js.map