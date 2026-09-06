import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reporter } from '../src/reporting';
import type { BrowserContext } from '../src/environment';
import type { SecurityEvent } from '../src/types';
import { browser } from './helpers';

let context: BrowserContext;
const reporters: Reporter[] = [];
const event: SecurityEvent = { type: 'DEVTOOLS_DETECTED', confidence: 60, timestamp: 1234, path: '/users/private-id', signals: [] };
function reporter(options: ConstructorParameters<typeof Reporter>[1] = { endpoint: '/events' }): Reporter {
  const value = new Reporter(context, options); reporters.push(value); return value;
}
beforeEach(() => { vi.useFakeTimers(); context = browser(); });
afterEach(() => { reporters.splice(0).forEach(value => value.stop()); expect(vi.getTimerCount()).toBe(0); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('privacy-aware reporting', () => {
  it('posts only a minimal whitelist and never includes credentials or referrers', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetch);
    reporter().send(event);
    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/events', expect.objectContaining({ method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store' }));
    expect(JSON.parse(fetch.mock.calls[0]![1].body as string)).toEqual({ type: event.type, confidence: 60, timestamp: 1234 });
    await vi.runAllTimersAsync();
  });

  it('only includes paths when opted in, allowing route sanitization', () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetch);
    reporter({ endpoint: '/events', includePath: true, pathSanitizer: () => '/users/:id' }).send(event);
    expect(JSON.parse(fetch.mock.calls[0]![1].body as string).path).toBe('/users/:id');
  });

  it('aborts on timeout, limits concurrency and cancels pending requests on stop', () => {
    const fetch = vi.fn().mockReturnValue(new Promise(() => undefined));
    vi.stubGlobal('fetch', fetch);
    const value = reporter({ endpoint: '/events', timeout: 500 });
    value.send(event); value.send(event); value.send(event);
    expect(fetch).toHaveBeenCalledTimes(2);
    const signal = fetch.mock.calls[0]![1].signal as AbortSignal;
    vi.advanceTimersByTime(500);
    expect(signal.aborted).toBe(true);
    value.send(event);
    value.stop();
    expect((fetch.mock.calls[2]![1].signal as AbortSignal).aborted).toBe(true);
  });

  it('silently handles throws, rejections, unavailable fetch and disabled reporting', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    reporter().send(event);
    await vi.runAllTimersAsync();
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('sync failure'); }));
    expect(() => reporter().send(event)).not.toThrow();
    vi.stubGlobal('fetch', undefined);
    expect(() => reporter().send(event)).not.toThrow();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    reporter({ endpoint: '/events', enabled: false }).send(event);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects unexpected origins and protocols, allowing explicit cross-origin telemetry', () => {
    expect(() => reporter({ endpoint: 'https://telemetry.test/events' })).toThrow();
    expect(() => reporter({ endpoint: 'javascript:alert(1)' })).toThrow();
    expect(() => reporter({ endpoint: 'https://telemetry.test/events', allowCrossOrigin: true })).not.toThrow();
  });
});
