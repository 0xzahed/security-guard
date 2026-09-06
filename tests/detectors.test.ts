import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BehaviorDetector, DebuggerDetector, DimensionDetector, KeyboardDetector } from '../src/detectors';
import type { BrowserContext } from '../src/environment';
import { browser } from './helpers';

let context: BrowserContext;
beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] }); context = browser(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('dimension detector', () => {
  it('waits for stable dimensions and resets settling on resize', () => {
    const detector = new DimensionDetector(context, { gap: 180, settleTime: 2000 });
    vi.stubGlobal('outerWidth', 1600);
    detector.start();
    expect(detector.sample().detected).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(detector.sample()).toMatchObject({ name: 'dimension', detected: true, confidence: 100, metadata: { widthGap: 400 } });
    window.dispatchEvent(new Event('resize'));
    expect(detector.sample().detected).toBe(false);
    detector.stop();
    vi.advanceTimersByTime(3000);
    expect(detector.sample().detected).toBe(false);
  });

  it.each(['mobile', 'coarse', 'pinch', 'zoom', 'rotation'])('suppresses %s measurements', mode => {
    const detector = new DimensionDetector(context, { gap: 180, settleTime: 2000 });
    vi.stubGlobal('outerWidth', 1600);
    detector.start();
    vi.advanceTimersByTime(2000);
    if (mode === 'mobile') vi.stubGlobal('innerWidth', 390);
    if (mode === 'coarse') vi.stubGlobal('matchMedia', () => ({ matches: true }));
    if (mode === 'pinch') vi.stubGlobal('visualViewport', { scale: 1.2, removeEventListener: vi.fn() });
    if (mode === 'zoom') vi.stubGlobal('devicePixelRatio', 1.25);
    if (mode === 'rotation') window.dispatchEvent(new Event('orientationchange'));
    expect(detector.sample().detected).toBe(false);
    detector.stop();
  });
});

describe('keyboard detector', () => {
  it.each([
    { key: 'F12' }, { key: 'I', ctrlKey: true, shiftKey: true },
    { key: 'j', ctrlKey: true, shiftKey: true }, { key: 'c', ctrlKey: true, shiftKey: true },
    { key: 'i', metaKey: true, altKey: true }, { key: 'j', metaKey: true, altKey: true },
  ])('observes a delivered trusted shortcut %j without preventing it', input => {
    const add = vi.spyOn(window, 'addEventListener');
    const detector = new KeyboardDetector(context, 1000);
    detector.start();
    const listener = add.mock.calls.find(([name]) => name === 'keydown')?.[1] as (event: KeyboardEvent) => void;
    const preventDefault = vi.fn();
    listener({ ...input, isTrusted: true, preventDefault } as unknown as KeyboardEvent);
    expect(detector.sample()).toMatchObject({ name: 'keyboard', detected: true });
    expect(preventDefault).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1001);
    expect(detector.sample().detected).toBe(false);
    detector.stop();
  });

  it('ignores synthetic events, unrelated input, repeats and composition', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const detector = new KeyboardDetector(context, 1000);
    detector.start();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F12' }));
    expect(detector.sample().detected).toBe(false);
    const listener = add.mock.calls.find(([name]) => name === 'keydown')?.[1] as (event: KeyboardEvent) => void;
    for (const input of [{ key: 'a' }, { key: 'F12', repeat: true }, { key: 'F12', isComposing: true }, { key: 'F12', altKey: true }]) {
      listener({ ...input, isTrusted: true } as unknown as KeyboardEvent);
      expect(detector.sample().detected).toBe(false);
    }
    detector.stop();
  });
});

describe('timing detectors', () => {
  it('runs debugger probes only at their configured interval and expires cached evidence', () => {
    let clock = 0;
    const timing = { ...context, clock: vi.fn(() => clock) };
    const detector = new DebuggerDetector(timing, { interval: 5000, delayThreshold: 1000, ttl: 1000 });
    detector.start();
    expect(detector.sample().detected).toBe(false);
    clock = 5000;
    timing.clock.mockReturnValueOnce(5000).mockReturnValueOnce(5000).mockReturnValueOnce(6500).mockReturnValueOnce(6500);
    expect(detector.sample()).toMatchObject({ detected: true, metadata: { delayMs: 1500 } });
    vi.advanceTimersByTime(1001);
    expect(detector.sample().detected).toBe(false);
    detector.stop();
    clock = 100000;
    expect(detector.sample().detected).toBe(false);
  });

  it('does not probe while hidden or unfocused', () => {
    const detector = new DebuggerDetector(context, { interval: 5000, delayThreshold: 100, ttl: 1000 });
    detector.start();
    vi.advanceTimersByTime(10000);
    vi.mocked(document.hasFocus).mockReturnValue(false);
    expect(detector.sample().detected).toBe(false);
    detector.stop();
  });

  it('detects foreground drift, resets on focus changes, excludes SDK work and long sleeps', () => {
    const detector = new BehaviorDetector(context, { interval: 1000, delayThreshold: 1500, ttl: 1000 });
    detector.start();
    expect(detector.sample().detected).toBe(false);
    vi.advanceTimersByTime(3000);
    expect(detector.sample().detected).toBe(true);
    window.dispatchEvent(new Event('blur'));
    expect(detector.sample().detected).toBe(false);
    vi.advanceTimersByTime(4000);
    detector.checkpoint();
    vi.advanceTimersByTime(1000);
    expect(detector.sample().detected).toBe(false);
    vi.advanceTimersByTime(20000);
    expect(detector.sample().detected).toBe(false);
    detector.stop();
  });
});
