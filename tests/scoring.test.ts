import { describe, expect, it } from 'vitest';
import { calculateScore, DetectionState } from '../src/scoring';
import { resolveConfig } from '../src/config';
import { observation } from './helpers';

const config = resolveConfig();

describe('scoring', () => {
  it('combines distinct categories at an inclusive threshold', () => {
    expect(calculateScore([observation('dimension'), observation('debugger')], config)).toMatchObject({ score: 60, confirmed: true });
    expect(calculateScore([observation('dimension'), observation('keyboard')], config)).toMatchObject({ score: 35, confirmed: false });
  });

  it('never confirms one signal, even with weight 100 and threshold 1', () => {
    expect(calculateScore([observation('dimension')], { ...config, threshold: 1, weights: { ...config.weights, dimension: 100 } })).toMatchObject({ score: 100, confirmed: false });
  });

  it('does not double count correlated timing signals or duplicates', () => {
    expect(calculateScore([observation('debugger'), observation('behavior'), observation('debugger')], { ...config, threshold: 20 })).toMatchObject({ score: 40, confirmed: false, groups: ['timing'] });
  });

  it('weights quality, caps confidence and ignores stale, future, unknown and invalid observations', () => {
    const now = Date.now();
    expect(calculateScore([observation('dimension', true, 50, now), observation('debugger', true, 500, now)], config, now).score).toBe(50);
    const invalid = [
      { ...observation('dimension', true, 100, now), timestamp: now - 10001 },
      { ...observation('debugger', true, 100, now), timestamp: now + 1 },
      observation('keyboard', false, 0, now), observation('behavior', true, NaN, now), observation('unknown', true, 100, now), observation('toString', true, 100, now),
    ];
    expect(calculateScore(invalid, config, now)).toMatchObject({ score: 0, confirmed: false });
  });

  it('zero weights cannot satisfy evidence diversity', () => {
    expect(calculateScore([observation('dimension'), observation('keyboard')], { ...config, threshold: 1, weights: { ...config.weights, keyboard: 0 } }).confirmed).toBe(false);
  });
});

describe('temporal protection', () => {
  it('requires sustained confirmation and resets a broken candidate', () => {
    const state = new DetectionState(config);
    expect(state.update(true, 0)).toBeUndefined();
    expect(state.update(false, 500)).toBeUndefined();
    expect(state.update(true, 1000)).toBeUndefined();
    expect(state.update(true, 1999)).toBeUndefined();
    expect(state.update(true, 2000)).toBe('detected');
    expect(state.update(true, 90000)).toBeUndefined();
  });

  it('debounces clearing, applies cooldown to new episodes and eventually recovers', () => {
    const state = new DetectionState({ ...config, debounce: 0 });
    expect(state.update(true, 0)).toBe('detected');
    expect(state.update(false, 1000)).toBeUndefined();
    expect(state.update(false, 3000)).toBe('cleared');
    expect(state.update(true, 4000)).toBeUndefined();
    expect(state.update(true, 30000)).toBe('detected');
  });

  it('can interrupt candidates and reset state with or without cooldown', () => {
    const state = new DetectionState(config);
    state.update(true, 0);
    state.interrupt();
    expect(state.update(true, 1000)).toBeUndefined();
    expect(state.update(true, 2000)).toBe('detected');
    state.reset(true);
    state.update(true, 3000);
    expect(state.update(true, 4000)).toBeUndefined();
    state.reset();
    state.update(true, 5000);
    expect(state.update(true, 6000)).toBe('detected');
  });
});
