import type { BrowserContext } from '../environment';
import type { DetectionSignal, DetectorName, EvidenceGroup } from '../types';

/** Each detector owns and cleans up its listeners; sampling must stay inexpensive. */
export interface Detector {
  readonly name: DetectorName;
  readonly group: EvidenceGroup;
  start(): void;
  sample(): DetectionSignal;
  stop(): void;
}

export function signal(context: BrowserContext, name: DetectorName, detected = false, metadata?: Record<string, unknown>): DetectionSignal {
  return {
    name,
    detected,
    confidence: detected ? 100 : 0,
    timestamp: context.now(),
    ...(metadata ? { metadata } : {}),
  };
}

export function freshSignal(context: BrowserContext, name: DetectorName, cached: DetectionSignal | undefined, ttl: number): DetectionSignal {
  const age = cached ? context.now() - cached.timestamp : Infinity;
  return cached && age >= 0 && age <= ttl ? cached : signal(context, name);
}
