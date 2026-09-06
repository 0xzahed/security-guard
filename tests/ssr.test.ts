/** @vitest-environment node */
import { describe, expect, it, vi } from 'vitest';

 describe('SSR safety', () => {
  it('imports with no browser globals and makes initialization a controlled no-op', async () => {
    expect(typeof window).toBe('undefined');
    const { default: SecurityGuard, createSecurityGuard } = await import('../src');
    expect(SecurityGuard.getStatus().lifecycle).toBe('stopped');
    const timer = vi.spyOn(globalThis, 'setTimeout');
    const value = createSecurityGuard().start({ debugger: { enabled: true }, reporting: { endpoint: '/events' } });
    expect(value.getStatus()).toMatchObject({ lifecycle: 'unsupported', state: 'normal', score: 0 });
    value.pause(); value.resume(); value.stop();
    expect(timer).not.toHaveBeenCalled();
    expect(value.getStatus().lifecycle).toBe('stopped');
  });

  it('imports detector and scoring submodules without touching browser globals', async () => {
    const detectors = await import('../src/detectors');
    const scoring = await import('../src/scoring');
    expect(detectors.DimensionDetector).toBeTypeOf('function');
    expect(scoring.calculateScore).toBeTypeOf('function');
  });
});
