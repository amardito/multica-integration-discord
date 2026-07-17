import { TextChannel, Channel } from 'discord.js';
import { DiscordBotTransport, DiscordDelivery, renderMessage } from '../discord';
import { NormalizedAlert } from '../../events/types';

function sampleAlert(): NormalizedAlert {
  return {
    severity: 'warning',
    category: 'issue',
    title: '🟡 [ISSUE] created',
    body: '**Entity:** `TEL-90`\n\nNew issue created.',
    footer: 'category=issue',
  };
}

function makeMockChannel(sendResult: unknown): TextChannel {
  return {
    isTextBased: () => true,
    send: jest.fn().mockResolvedValue(sendResult),
  } as unknown as TextChannel;
}

function makeMockClient(channel: Channel | null): {
  client: { channels: { fetch: jest.Mock } };
  fetchMock: jest.Mock;
} {
  const fetchMock = jest.fn().mockResolvedValue(channel);
  return {
    client: { channels: { fetch: fetchMock } },
    fetchMock,
  };
}

describe('DiscordBotTransport', () => {
  it('sends a message to a text channel', async () => {
    const channel = makeMockChannel({ id: 'msg-1' });
    const { client, fetchMock } = makeMockClient(channel);

    const transport = new DiscordBotTransport({ client: client as any, channelId: 'chan-1' });
    const result = await transport.send('hello');

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('chan-1');
    expect(channel.send).toHaveBeenCalledWith('hello');
  });

  it('returns failure when channel is not found', async () => {
    const { client, fetchMock } = makeMockClient(null);
    const transport = new DiscordBotTransport({ client: client as any, channelId: 'chan-1' });
    const result = await transport.send('hello');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('not found');
    expect(fetchMock).toHaveBeenCalledWith('chan-1');
  });

  it('returns failure when channel is not text-based', async () => {
    const nonTextChannel = { isTextBased: () => false } as unknown as Channel;
    const { client } = makeMockClient(nonTextChannel);
    const transport = new DiscordBotTransport({ client: client as any, channelId: 'chan-1' });
    const result = await transport.send('hello');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('not a text channel');
  });

  it('returns failure when send throws', async () => {
    const channel = {
      isTextBased: () => true,
      send: jest.fn().mockRejectedValue(new Error('network error')),
    } as unknown as TextChannel;
    const { client } = makeMockClient(channel);
    const transport = new DiscordBotTransport({ client: client as any, channelId: 'chan-1' });
    const result = await transport.send('hello');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('network error');
  });

  it('throws when client is missing', () => {
    expect(() => new DiscordBotTransport({ client: undefined as any, channelId: 'chan-1' })).toThrow('client');
  });

  it('throws when channelId is missing', () => {
    const { client } = makeMockClient(null);
    expect(() => new DiscordBotTransport({ client: client as any, channelId: '' })).toThrow('channelId');
  });
});

describe('DiscordDelivery with bot transport', () => {
  it('delivers a formatted alert through a bot transport', async () => {
    const channel = makeMockChannel({ id: 'msg-1' });
    const { client } = makeMockClient(channel);
    const transport = new DiscordBotTransport({ client: client as any, channelId: 'chan-1' });
    const delivery = new DiscordDelivery({ transport });

    const result = await delivery.send(sampleAlert());

    expect(result.ok).toBe(true);
    expect(channel.send).toHaveBeenCalledWith(renderMessage(sampleAlert()));
  });
});
