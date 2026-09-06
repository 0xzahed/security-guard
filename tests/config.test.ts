import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../src/config';
import type { SecurityGuardConfig } from '../src/types';

describe('configuration', () => {
  it('has conservative, independent defaults', () => {
    const config = resolveConfig();
    expect(config).toMatchObject({ enabled: true, sensitivity: 'medium', interval: 1000, threshold: 60, debounce: 1000, clearDebounce: 2000, cooldown: 30000, signalTtl: 10000, reporting: false, action: 'overlay', keyboard: true });
    expect(config.debugger).toEqual({ enabled: false, interval: 15000, delayThreshold: 1500 });
    expect(config.weights).toEqual({ dimension: 20, debugger: 40, keyboard: 15, behavior: 25 });
  });

  it('supports all presets, shorthand and precedence', () => {
    expect(resolveConfig({ sensitivity: 'low' }).threshold).toBe(75);
    expect(resolveConfig({ sensitivity: 'high' }).threshold).toBe(50);
    expect(resolveConfig({ devtools: false }).enabled).toBe(false);
    expect(resolveConfig({ devtools: { enabled: false } }).enabled).toBe(false);
    expect(resolveConfig({ devtools: { threshold: 70 }, scoring: { threshold: 55 } }).threshold).toBe(55);
    expect(resolveConfig({ scoring: { weights: { dimension: 10 } } }).weights.debugger).toBe(40);
  });

  it.each<SecurityGuardConfig>([
    { scoring: { threshold: 0 } }, { scoring: { threshold: 101 } },
    { scoring: { weights: { dimension: NaN } } }, { scoring: { weights: { debugger: -1 } } },
    { devtools: { interval: 0 } }, { debugger: { interval: 50 } },
    { signalTtl: 500 }, { cooldown: Infinity }, { debounce: -1 },
    { reporting: { endpoint: '' } }, { reporting: { endpoint: '/events', timeout: -1 } },
  ])('rejects invalid values: %j', config => { expect(() => resolveConfig(config)).toThrow(); });

  it('rejects malformed JavaScript configuration', () => {
    expect(() => resolveConfig({ sensitivity: 'unknown' } as unknown as SecurityGuardConfig)).toThrow();
    expect(() => resolveConfig({ action: { type: 'callback' } } as SecurityGuardConfig)).toThrow();
    expect(() => resolveConfig({ action: 'unknown' } as unknown as SecurityGuardConfig)).toThrow();
  });

  it('copies caller configuration and keeps defaults isolated', () => {
    const input: SecurityGuardConfig = { scoring: { weights: { dimension: 15 } }, reporting: { endpoint: '/events' } };
    const resolved = resolveConfig(input);
    resolved.weights.dimension = 90;
    expect(input.scoring?.weights?.dimension).toBe(15);
    expect(resolveConfig().weights.dimension).toBe(20);
    expect(input.reporting).toEqual({ endpoint: '/events' });
  });
});
