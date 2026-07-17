/**
 * Multica Discord integration worker.
 *
 * Polls the Multica inbox for workspace notifications and delivers formatted
 * alerts to Discord via the shared alert pipeline and a Discord bot transport.
 * Exits with code 1 if required environment variables are missing.
 */

import { Client, GatewayIntentBits } from 'discord.js';
import { AlertPipeline } from './alerts/pipeline';
import { DiscordBotTransport, DiscordDelivery } from './delivery/discord';
import { MulticaInboxSource } from './sources/multica';
import { consoleLogger } from './util/dedupe';

interface Env {
  DISCORD_BOT_TOKEN: string;
  DISCORD_CHANNEL_ID: string;
  MULTICA_API_BASE_URL: string;
  MULTICA_API_TOKEN: string;
  MULTICA_WORKSPACE_ID: string;
  POLL_INTERVAL_MS: number;
  LOG_LEVEL: string;
}

function parseEnv(pollIntervalDefault = 10000): Env {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    throw new Error('DISCORD_BOT_TOKEN is required');
  }

  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId) {
    throw new Error('DISCORD_CHANNEL_ID is required');
  }

  const apiUrl = process.env.MULTICA_API_BASE_URL || 'http://host.docker.internal:3000';
  const apiToken = process.env.MULTICA_API_TOKEN;
  if (!apiToken) {
    throw new Error('MULTICA_API_TOKEN is required');
  }

  const workspaceId = process.env.MULTICA_WORKSPACE_ID;
  if (!workspaceId) {
    throw new Error('MULTICA_WORKSPACE_ID is required');
  }

  const pollInterval = parseInt(process.env.POLL_INTERVAL_MS || String(pollIntervalDefault), 10);
  if (isNaN(pollInterval) || pollInterval <= 0) {
    throw new Error('POLL_INTERVAL_MS must be a positive number');
  }

  const logLevel = process.env.LOG_LEVEL || 'info';

  return {
    DISCORD_BOT_TOKEN: botToken,
    DISCORD_CHANNEL_ID: channelId,
    MULTICA_API_BASE_URL: apiUrl,
    MULTICA_API_TOKEN: apiToken,
    MULTICA_WORKSPACE_ID: workspaceId,
    POLL_INTERVAL_MS: pollInterval,
    LOG_LEVEL: logLevel,
  };
}

export { parseEnv };

async function main(): Promise<void> {
  const env = parseEnv();
  consoleLogger.info('Multica Discord worker starting', {
    apiUrl: env.MULTICA_API_BASE_URL,
    workspaceId: env.MULTICA_WORKSPACE_ID,
    pollInterval: env.POLL_INTERVAL_MS,
  });

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  await client.login(env.DISCORD_BOT_TOKEN);
  consoleLogger.info('Discord bot connected');

  const source = new MulticaInboxSource({
    baseUrl: env.MULTICA_API_BASE_URL,
    apiToken: env.MULTICA_API_TOKEN,
    workspaceId: env.MULTICA_WORKSPACE_ID,
  });

  const delivery = new DiscordDelivery({
    transport: new DiscordBotTransport({ client, channelId: env.DISCORD_CHANNEL_ID }),
  });

  const pipeline = new AlertPipeline({ delivery, logger: consoleLogger });

  while (true) {
    try {
      const events = await source.poll();
      consoleLogger.info(`Fetched ${events.length} notifications from Multica`);

      for (const event of events) {
        const eventId = event.metadata?.notificationId as string | undefined;
        await pipeline.handle(event, eventId);
      }
    } catch (error) {
      consoleLogger.error('Error in poll loop', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await new Promise((resolve) => setTimeout(resolve, env.POLL_INTERVAL_MS));
  }
}

export { main };

if (require.main === module) {
  main().catch((error) => {
    consoleLogger.error('Fatal error starting worker', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });
}
