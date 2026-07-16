import { NormalizedAlert } from '../../events/types';
import { DiscordDelivery, DiscordTransport, SendResult, renderMessage } from '../discord';

function makeFakeTransport(results: SendResult[]): DiscordTransport {
  let index = 0;
  return {
    async send(_message: string): Promise<SendResult> {
      const result = results[index] ?? { ok: true };
      index += 1;
      return result;
    },
  };
}

function sampleAlert(): NormalizedAlert {
  return {
    severity: 'warning',
    category: 'issue',
    title: '🟡 [ISSUE] created',
    body: '**Entity:** `TEL-90`\n\nNew issue created.',
    footer: 'category=issue',
  };
}

describe('DiscordDelivery', () => {
  it('delivers a formatted alert through the transport', async () => {
    const transport = makeFakeTransport([{ ok: true }]);
    const delivery = new DiscordDelivery({ transport });

    const result = await delivery.send(sampleAlert());
    expect(result.ok).toBe(true);
  });

  it('returns failure when transport fails', async () => {
    const transport = makeFakeTransport([{ ok: false, error: 'rate limited' }]);
    const delivery = new DiscordDelivery({ transport });

    const result = await delivery.send(sampleAlert());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('rate limited');
  });

  it('catches unexpected transport errors', async () => {
    const transport: DiscordTransport = {
      async send(): Promise<SendResult> {
        throw new Error('network partition');
      },
    };
    const delivery = new DiscordDelivery({ transport });

    const result = await delivery.send(sampleAlert());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('network partition');
    expect(result.error).toContain('discord delivery failed');
  });

  it('throws when neither webhookUrl nor transport is provided', () => {
    expect(() => new DiscordDelivery({})).toThrow('requires either webhookUrl or transport');
  });
});

describe('renderMessage', () => {
  it('renders a complete alert message', () => {
    const message = renderMessage(sampleAlert());
    expect(message).toContain('🟡 [ISSUE] created');
    expect(message).toContain('TEL-90');
    expect(message).toContain('category=issue');
  });
});

describe('sendToWebhook', () => {
  it('rejects non-https URLs', async () => {
    const result = await sendToWebhook('http://example.com/webhook', 'hello');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('must use https://');
  });

  it('rejects empty content', async () => {
    const result = await sendToWebhook('https://example.com/webhook', '');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('empty message content');
  });
});

// Re-import the local function for unit testing without reaching to the network.
import { sendToWebhook } from '../discord';
