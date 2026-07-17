/**
 * Discord delivery adapter.
 *
 * The actual HTTP transport is abstracted behind `DiscordTransport` so tests can
 * substitute a fake. The production transport uses Node's built-in `https` module
 * to avoid extra dependencies.
 */

import { Client, Channel, TextChannel } from 'discord.js';
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

export interface DiscordBotTransportConfig {
  client: Client;
  channelId: string;
}

export class DiscordDelivery {
  private readonly transport: DiscordTransport;

  constructor(config: DiscordDeliveryConfig = {}) {
    if (config.transport) {
      this.transport = config.transport;
    } else if (config.webhookUrl) {
      this.transport = createHttpTransport(config.webhookUrl);
    } else {
      throw new Error('DiscordDelivery requires either webhookUrl or transport');
    }
  }

  /**
   * Deliver a formatted alert to the configured channel.
   *
   * Swallows errors and returns a failure object so the caller can log safely
   * without crashing the bot.
   */
  async send(alert: NormalizedAlert): Promise<SendResult> {
    const message = renderMessage(alert);

    try {
      return await this.transport.send(message);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `discord delivery failed: ${reason}` };
    }
  }
}

/** Render a normalized alert into a plain-text message suitable for Discord. */
export function renderMessage(alert: NormalizedAlert): string {
  return [
    `**${alert.title}**`,
    '',
    alert.body,
    '',
    `_${alert.footer}_`,
  ].join('\n');
}

/**
 * Discord bot transport that sends messages to a specific text channel.
 *
 * The caller is responsible for logging the bot in and ensuring the client is
 * ready before sending messages.
 */
export class DiscordBotTransport implements DiscordTransport {
  private readonly client: Client;
  private readonly channelId: string;

  constructor(config: DiscordBotTransportConfig) {
    if (!config.client) {
      throw new Error('DiscordBotTransport requires client');
    }
    if (!config.channelId) {
      throw new Error('DiscordBotTransport requires channelId');
    }
    this.client = config.client;
    this.channelId = config.channelId;
  }

  async send(message: string): Promise<SendResult> {
    const channel = await this.resolveChannel();
    if (!channel) {
      return { ok: false, error: `channel ${this.channelId} not found or not accessible` };
    }
    if (!channel.isTextBased()) {
      return { ok: false, error: `channel ${this.channelId} is not a text channel` };
    }
    try {
      await (channel as TextChannel).send(message);
      return { ok: true };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `discord bot send failed: ${reason}` };
    }
  }

  private async resolveChannel(): Promise<Channel | null> {
    try {
      return await this.client.channels.fetch(this.channelId);
    } catch (err) {
      return null;
    }
  }
}

function createHttpTransport(webhookUrl: string): DiscordTransport {
  return {
    async send(message: string): Promise<SendResult> {
      return sendToWebhook(webhookUrl, message);
    },
  };
}

/** Production webhook sender using only built-in modules. */
export function sendToWebhook(webhookUrl: string, content: string): Promise<SendResult> {
  return new Promise((resolve) => {
    if (!webhookUrl.startsWith('https://')) {
      resolve({ ok: false, error: 'invalid webhook URL: must use https://' });
      return;
    }

    if (content.length === 0) {
      resolve({ ok: false, error: 'empty message content' });
      return;
    }

    // Dynamic import keeps the module loadable in test environments that may
    // stub Node's https module.
    import('node:https')
      .then(({ default: https, request }) => {
        const url = new URL(webhookUrl);
        const payload = JSON.stringify({ content });

        const req = request(
          {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
          },
          (res) => {
            const status = res.statusCode ?? 0;
            if (status >= 200 && status < 300) {
              resolve({ ok: true });
            } else {
              let body = '';
              res.setEncoding('utf8');
              res.on('data', (chunk) => {
                body += chunk;
              });
              res.on('end', () => {
                resolve({
                  ok: false,
                  error: `discord returned HTTP ${status}: ${truncate(body, 200)}`,
                });
              });
              res.on('error', () => {
                resolve({ ok: false, error: `discord returned HTTP ${status}` });
              });
            }
          }
        );

        req.on('error', (err) => {
          resolve({ ok: false, error: `request failed: ${err.message}` });
        });

        req.write(payload);
        req.end();
      })
      .catch((err) => {
        resolve({ ok: false, error: `transport unavailable: ${err instanceof Error ? err.message : String(err)}` });
      });
  });
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

export { truncate as truncateErrorBody };
