/**
 * Discord delivery adapter.
 *
 * The actual HTTP transport is abstracted behind `DiscordTransport` so tests can
 * substitute a fake. The production transport uses Node's built-in `https` module
 * to avoid extra dependencies.
 */
import { NormalizedAlert } from '../events/types';
export interface DeliveryResult {
    ok: true;
}
export interface DeliveryFailure {
    ok: false;
    error: string;
}
export type SendResult = DeliveryResult | DeliveryFailure;
export interface DiscordTransport {
    send(message: string): Promise<SendResult>;
}
export interface DiscordDeliveryConfig {
    webhookUrl?: string;
    transport?: DiscordTransport;
}
export declare class DiscordDelivery {
    private readonly transport;
    constructor(config?: DiscordDeliveryConfig);
    /**
     * Deliver a formatted alert to the configured channel.
     *
     * Swallows errors and returns a failure object so the caller can log safely
     * without crashing the bot.
     */
    send(alert: NormalizedAlert): Promise<SendResult>;
}
/** Render a normalized alert into a plain-text message suitable for Discord. */
export declare function renderMessage(alert: NormalizedAlert): string;
/** Production webhook sender using only built-in modules. */
export declare function sendToWebhook(webhookUrl: string, content: string): Promise<SendResult>;
declare function truncate(value: string, max: number): string;
export { truncate as truncateErrorBody };
//# sourceMappingURL=discord.d.ts.map