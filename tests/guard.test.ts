import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SecurityGuard, { createSecurityGuard, type SecurityGuardInstance } from '../src';
import { BehaviorDetector, DebuggerDetector, DimensionDetector, KeyboardDetector } from '../src/detectors';
import { browser, observation } from './helpers';

const guards: SecurityGuardInstance[] = [];
function guard(): SecurityGuardInstance { const value = createSecurityGuard(); guards.push(value); return value; }
function evidence(): void {
  vi.spyOn(DimensionDetector.prototype, 'sample').mockImplementation(() => observation('dimension'));
  vi.spyOn(DebuggerDetector.prototype, 'sample').mockImplementation(() => observation('debugger'));
}
beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] }); browser(); });
afterEach(() => {
  guards.splice(0).forEach(value => value.stop());
  SecurityGuard.stop();
  vi.advanceTimersByTime(1);
  expect(vi.getTimerCount()).toBe(0);
  expect(document.querySelector('[data-security-guard]')).toBeNull();
  vi.useRealTimers(); vi.unstubAllGlobals();
});

describe('guard lifecycle', () => {
  it('supports singleton and independent instances with idempotent start/stop', () => {
    expect(SecurityGuard.start({ devtools: true })).toBe(SecurityGuard);
    const value = guard().start();
    expect(value.getStatus()).toMatchObject({ lifecycle: 'running', state: 'normal', score: 0 });
    expect(vi.getTimerCount()).toBe(2);
    value.start();
    expect(vi.getTimerCount()).toBe(2);
    value.stop(); value.stop();
    expect(value.getStatus()).toMatchObject({ lifecycle: 'stopped', score: 0, signals: [] });
    expect(SecurityGuard.getStatus().lifecycle).toBe('running');
  });

  it('does not register observation when disabled', () => {
    const value = guard().start({ devtools: false, debugger: { enabled: true } });
    expect(vi.getTimerCount()).toBe(0);
    expect(value.getStatus().lifecycle).toBe('stopped');
  });

  it('pauses, resumes and cleans every registered native listener and timer', () => {
    const addWindow = vi.spyOn(window, 'addEventListener');
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const addDocument = vi.spyOn(document, 'addEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    const value = guard().start();
    value.pause(); value.pause();
    expect(value.getStatus().lifecycle).toBe('paused');
    expect(vi.getTimerCount()).toBe(0);
    value.resume(); value.resume();
    expect(vi.getTimerCount()).toBe(1);
    value.stop();
    for (const args of addWindow.mock.calls) expect(removeWindow).toHaveBeenCalledWith(...args);
    for (const args of addDocument.mock.calls) expect(removeDocument).toHaveBeenCalledWith(...args);
  });

  it('suspends hidden/unfocused sampling and begins with fresh evidence on return', () => {
    const value = guard().start();
    vi.mocked(document.hasFocus).mockReturnValue(false);
    window.dispatchEvent(new Event('blur'));
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60000);
    expect(value.getScore()).toBe(0);
    vi.mocked(document.hasFocus).mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));
    expect(vi.getTimerCount()).toBe(1);
  });

  it('rejects invalid replacement configuration without stopping an existing guard', () => {
    const value = guard().start();
    expect(() => value.start({ devtools: { interval: 1 } })).toThrow();
    expect(() => value.start({ action: { type: 'redirect', url: 'javascript:alert(1)' } })).toThrow();
    expect(value.getStatus().lifecycle).toBe('running');
    expect(vi.getTimerCount()).toBe(1);
  });
});

describe('detection pipeline', () => {
  it('debounces detection, emits once per episode, applies/removes overlays and emits recovery', () => {
    evidence();
    const detected = vi.fn(); const cleared = vi.fn(); const violation = vi.fn(); const onDetected = vi.fn();
    const value = guard();
    value.on('detected', detected); value.on('cleared', cleared); value.on('violation', violation);
    value.start({ debugger: { enabled: true }, onDetected });
    vi.advanceTimersByTime(1000);
    expect(detected).not.toHaveBeenCalled();
    expect(value.getScore()).toBe(60);
    vi.advanceTimersByTime(1000);
    expect(detected).toHaveBeenCalledOnce();
    expect(onDetected).toHaveBeenCalledOnce();
    expect(violation).toHaveBeenCalledWith(expect.objectContaining({ type: 'SECURITY_VIOLATION' }));
    expect(value.getStatus().state).toBe('blocked');
    vi.advanceTimersByTime(40000);
    expect(detected).toHaveBeenCalledOnce();
    vi.mocked(DimensionDetector.prototype.sample).mockImplementation(() => observation('dimension', false));
    vi.mocked(DebuggerDetector.prototype.sample).mockImplementation(() => observation('debugger', false));
    vi.advanceTimersByTime(3000);
    expect(cleared).toHaveBeenCalledOnce();
    expect(value.getStatus()).toMatchObject({ state: 'normal', detected: false });
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('cannot block from resizing or sidebars alone even at maximum dimension weight', () => {
    vi.stubGlobal('outerWidth', 1800);
    const detected = vi.fn();
    const value = guard().start({ scoring: { threshold: 1, weights: { dimension: 100 } }, onDetected: detected });
    for (let index = 0; index < 10; index++) {
      window.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(1000);
    }
    vi.advanceTimersByTime(10000);
    expect(value.getScore()).toBe(100);
    expect(detected).not.toHaveBeenCalled();
    expect(value.getStatus().state).toBe('suspicious');
  });

  it('does not confirm two correlated timing detectors', () => {
    vi.spyOn(DebuggerDetector.prototype, 'sample').mockImplementation(() => observation('debugger'));
    vi.spyOn(BehaviorDetector.prototype, 'sample').mockImplementation(() => observation('behavior'));
    const callback = vi.fn();
    guard().start({ debugger: { enabled: true }, scoring: { threshold: 1 }, onDetected: callback });
    vi.advanceTimersByTime(10000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('supports passive callback actions and snapshot isolation', () => {
    evidence();
    const handler = vi.fn();
    const value = guard().start({ debugger: { enabled: true }, action: { type: 'callback', handler } });
    vi.advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledOnce();
    expect(value.getStatus()).toMatchObject({ state: 'suspicious', detected: true });
    value.getStatus().signals[0]!.confidence = 0;
    expect(value.getStatus().signals[0]?.confidence).toBe(100);
  });

  it.each(['detected', 'callback', 'onDetected', 'violation'])('handles stop from %s without orphan actions or timers', source => {
    evidence();
    const value = guard();
    const stop = (): void => value.stop();
    if (source === 'detected' || source === 'violation') value.on(source, stop);
    value.start({
      debugger: { enabled: true },
      ...(source === 'onDetected' ? { onDetected: stop } : {}),
      action: source === 'callback' ? { type: 'callback', handler: stop } : 'overlay',
    });
    vi.advanceTimersByTime(2000);
    expect(value.getStatus().lifecycle).toBe('stopped');
    expect(document.querySelector('dialog')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves subscriptions across stop/start and supports off', () => {
    evidence();
    const handler = vi.fn();
    const value = guard();
    value.on('detected', handler);
    value.start({ debugger: { enabled: true }, action: { type: 'callback', handler: () => undefined } });
    vi.advanceTimersByTime(2000);
    value.stop();
    value.off('detected', handler);
    value.start({ debugger: { enabled: true } });
    vi.advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledOnce();
    value.stop();
  });

  it('supports keyboard plus layout with explicitly tuned weights', () => {
    vi.spyOn(DimensionDetector.prototype, 'sample').mockImplementation(() => observation('dimension'));
    vi.spyOn(KeyboardDetector.prototype, 'sample').mockImplementation(() => observation('keyboard'));
    const handler = vi.fn();
    guard().start({ scoring: { threshold: 35 }, action: { type: 'callback', handler } });
    vi.advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledOnce();
  });
});
