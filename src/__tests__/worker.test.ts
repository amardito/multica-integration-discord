import { parseEnv } from '../worker';

describe('parseEnv', () => {
  const required = {
    DISCORD_BOT_TOKEN: 'bot-token',
    DISCORD_CHANNEL_ID: 'channel-1',
    MULTICA_API_TOKEN: 'api-token',
    MULTICA_WORKSPACE_ID: 'ws-1',
  };

  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...required };
    delete process.env.POLL_INTERVAL_MS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults POLL_INTERVAL_MS to 10000', () => {
    const env = parseEnv();
    expect(env.POLL_INTERVAL_MS).toBe(10000);
  });

  it('allows POLL_INTERVAL_MS to be overridden by the environment', () => {
    process.env.POLL_INTERVAL_MS = '5000';
    const env = parseEnv();
    expect(env.POLL_INTERVAL_MS).toBe(5000);
  });

  it('throws for invalid POLL_INTERVAL_MS', () => {
    process.env.POLL_INTERVAL_MS = 'not-a-number';
    expect(() => parseEnv()).toThrow('POLL_INTERVAL_MS must be a positive number');
  });

  it('throws for non-positive POLL_INTERVAL_MS', () => {
    process.env.POLL_INTERVAL_MS = '0';
    expect(() => parseEnv()).toThrow('POLL_INTERVAL_MS must be a positive number');
  });

  it('retains all required environment values', () => {
    const env = parseEnv();
    expect(env.DISCORD_BOT_TOKEN).toBe('bot-token');
    expect(env.DISCORD_CHANNEL_ID).toBe('channel-1');
    expect(env.MULTICA_API_TOKEN).toBe('api-token');
    expect(env.MULTICA_WORKSPACE_ID).toBe('ws-1');
    expect(env.MULTICA_API_BASE_URL).toBe('http://host.docker.internal:3000');
    expect(env.LOG_LEVEL).toBe('info');
  });
});

export {};
