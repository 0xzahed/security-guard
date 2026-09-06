import { vi } from 'vitest';
import type { BrowserContext } from '../src/environment';
import type { DetectionSignal } from '../src/types';

export function browser(): BrowserContext {
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.stubGlobal('innerWidth', 1200);
  vi.stubGlobal('innerHeight', 800);
  vi.stubGlobal('outerWidth', 1200);
  vi.stubGlobal('outerHeight', 880);
  vi.stubGlobal('devicePixelRatio', 1);
  return { window, document, now: () => Date.now(), clock: () => performance.now() };
}

export function observation(name: string, detected = true, confidence = 100, timestamp: number = Date.now()): DetectionSignal {
  return { name, detected, confidence: detected ? confidence : 0, timestamp };
}
