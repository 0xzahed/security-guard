import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSecurityGuard, type SecurityGuardInstance } from '../src';
import { DimensionDetector, KeyboardDetector } from '../src/detectors';
import { browser, observation } from './helpers';

const guards: SecurityGuardInstance[] = [];
function guard(): SecurityGuardInstance { const value = createSecurityGuard(); guards.push(value); return value; }

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] }); browser(); });
afterEach(() => {
  guards.splice(0).forEach(value => value.stop());
  vi.advanceTimersByTime(1);
  vi.useRealTimers(); vi.unstubAllGlobals();
});

describe('reset method', () => {
  it('clears score, signals and actions without changing lifecycle', () => {
    vi.spyOn(DimensionDetector.prototype, 'sample').mockImplementation(() => observation('dimension'));
    vi.spyOn(KeyboardDetector.prototype, 'sample').mockImplementation(() => observation('keyboard'));
    const value = guard().start({ scoring: { threshold: 35 }, action: 'overlay' });
    vi.advanceTimersByTime(2000);
    expect(value.getStatus().state).toBe('blocked');
    expect(value.getScore()).toBeGreaterThan(0);
    value.reset();
    expect(value.getScore()).toBe(0);
    expect(value.getStatus().signals).toHaveLength(0);
    expect(value.getStatus().state).toBe('normal');
    expect(value.getStatus().lifecycle).toBe('running');
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('is safe to call when stopped', () => {
    const value = guard();
    expect(() => value.reset()).not.toThrow();
    expect(value.getStatus().lifecycle).toBe('stopped');
  });

  it('is safe to call multiple times', () => {
    const value = guard().start();
    value.reset();
    value.reset();
    value.reset();
    expect(value.getStatus().lifecycle).toBe('running');
  });
});

describe('lifecycle edge cases', () => {
  it('pause when already paused is a no-op', () => {
    const value = guard().start();
    value.pause();
    expect(value.getStatus().lifecycle).toBe('paused');
    value.pause();
    expect(value.getStatus().lifecycle).toBe('paused');
  });

  it('resume when stopped is a no-op', () => {
    const value = guard();
    value.resume();
    expect(value.getStatus().lifecycle).toBe('stopped');
  });

  it('pause when stopped is a no-op', () => {
    const value = guard();
    value.pause();
    expect(value.getStatus().lifecycle).toBe('stopped');
  });

  it('start with devtools: false sets lifecycle to stopped', () => {
    const value = guard().start({ devtools: false });
    expect(value.getStatus().lifecycle).toBe('stopped');
  });

  it('start with no config uses defaults', () => {
    const value = guard().start();
    expect(value.getStatus().lifecycle).toBe('running');
    expect(value.getScore()).toBe(0);
  });

  it('multiple start calls are idempotent', () => {
    const value = guard();
    value.start();
    value.start();
    value.start();
    expect(value.getStatus().lifecycle).toBe('running');
    expect(vi.getTimerCount()).toBe(1);
  });
});

describe('event isolation', () => {
  it('one handler throwing does not affect other handlers', () => {
    const value = guard();
    const good = vi.fn();
    value.on('detected', () => { throw new Error('boom'); });
    value.on('detected', good);
    // Manually emit via internal detection
    vi.spyOn(DimensionDetector.prototype, 'sample').mockImplementation(() => observation('dimension'));
    vi.spyOn(KeyboardDetector.prototype, 'sample').mockImplementation(() => observation('keyboard'));
    value.start({ scoring: { threshold: 35 }, action: { type: 'callback', handler: () => undefined }, onDetected: () => undefined, debounce: 0 });
    vi.advanceTimersByTime(2000);
    expect(good).toHaveBeenCalled();
  });

  it('off removes the correct handler', () => {
    const value = guard();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const unsub1 = value.on('detected', handler1);
    value.on('detected', handler2);
    unsub1();
    vi.spyOn(DimensionDetector.prototype, 'sample').mockImplementation(() => observation('dimension'));
    vi.spyOn(KeyboardDetector.prototype, 'sample').mockImplementation(() => observation('keyboard'));
    value.start({ scoring: { threshold: 35 }, action: { type: 'callback', handler: () => undefined }, debounce: 0, onDetected: () => undefined });
    vi.advanceTimersByTime(2000);
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });
});

describe('getStatus snapshot isolation', () => {
  it('returns deep copies of signals', () => {
    vi.spyOn(DimensionDetector.prototype, 'sample').mockImplementation(() => observation('dimension', true, 80));
    const value = guard().start();
    vi.advanceTimersByTime(1000);
    const status1 = value.getStatus();
    status1.signals[0]!.confidence = 0;
    const status2 = value.getStatus();
    expect(status2.signals[0]?.confidence).toBe(80);
  });
});
