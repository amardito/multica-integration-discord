import { EventDeduper, noopLogger, consoleLogger } from '../dedupe';

describe('EventDeduper', () => {
  it('accepts a new event id', () => {
    const deduper = new EventDeduper();
    expect(deduper.check('evt-1')).toEqual({ ok: true });
    expect(deduper.size()).toBe(1);
  });

  it('rejects duplicate event ids', () => {
    const deduper = new EventDeduper();
    deduper.check('evt-1');
    expect(deduper.check('evt-1')).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('rejects malformed event ids', () => {
    const deduper = new EventDeduper();
    expect(deduper.check('')).toEqual({ ok: false, reason: 'malformed' });
    expect(deduper.check(undefined)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('evicts oldest entries when max size is exceeded', () => {
    const deduper = new EventDeduper(2);
    deduper.check('a');
    deduper.check('b');
    deduper.check('c'); // 'a' may be evicted to keep size at 2
    expect(deduper.size()).toBeLessThanOrEqual(2);
    // Re-adding 'b' must still be a duplicate.
    expect(deduper.check('b')).toEqual({ ok: false, reason: 'duplicate' });
    // 'a' was evicted, so it can be re-added.
    expect(deduper.check('a')).toEqual({ ok: true });
  });

  it('throws for non-positive max size', () => {
    expect(() => new EventDeduper(0)).toThrow('maxSize must be positive');
    expect(() => new EventDeduper(-1)).toThrow('maxSize must be positive');
  });

  it('clears all tracked ids', () => {
    const deduper = new EventDeduper();
    deduper.check('evt-1');
    deduper.clear();
    expect(deduper.size()).toBe(0);
  });
});

describe('loggers', () => {
  it('noopLogger methods do not throw', () => {
    expect(() => {
      noopLogger.debug('debug');
      noopLogger.info('info');
      noopLogger.warn('warn');
      noopLogger.error('error');
    }).not.toThrow();
  });

  it('consoleLogger wraps console methods', () => {
    const spyDebug = jest.spyOn(console, 'debug').mockImplementation(() => {});
    const spyInfo = jest.spyOn(console, 'info').mockImplementation(() => {});
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

    consoleLogger.debug('d');
    consoleLogger.info('i');
    consoleLogger.warn('w');
    consoleLogger.error('e');

    expect(spyDebug).toHaveBeenCalledWith('d');
    expect(spyInfo).toHaveBeenCalledWith('i');
    expect(spyWarn).toHaveBeenCalledWith('w');
    expect(spyError).toHaveBeenCalledWith('e');

    spyDebug.mockRestore();
    spyInfo.mockRestore();
    spyWarn.mockRestore();
    spyError.mockRestore();
  });
});
