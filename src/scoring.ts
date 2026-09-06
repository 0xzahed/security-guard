import type { DetectionSignal, DetectorName, EvidenceGroup } from './types';

export interface ScoreOptions {
  weights: Record<DetectorName, number>;
  threshold: number;
  signalTtl: number;
}

export interface ScoreResult {
  score: number;
  confirmed: boolean;
  groups: EvidenceGroup[];
}

const groups: Record<DetectorName, EvidenceGroup> = {
  dimension: 'layout', debugger: 'timing', keyboard: 'interaction', behavior: 'timing',
};

/** Sum the strongest contribution per evidence category; require at least two independent categories. */
export function calculateScore(signals: readonly DetectionSignal[], options: ScoreOptions, now = Date.now()): ScoreResult {
  const contributions = new Map<EvidenceGroup, number>();
  for (const signal of signals) {
    if (!Object.hasOwn(groups, signal.name) || !signal.detected || !Number.isFinite(signal.confidence)) continue;
    const age = now - signal.timestamp;
    if (!Number.isFinite(age) || age < 0 || age > options.signalTtl) continue;
    const name = signal.name as DetectorName;
    const weight = options.weights[name];
    if (!Number.isFinite(weight) || weight <= 0) continue;
    const contribution = Math.min(100, weight) * Math.max(0, Math.min(100, signal.confidence)) / 100;
    if (contribution <= 0) continue;
    contributions.set(groups[name], Math.max(contributions.get(groups[name]) ?? 0, contribution));
  }
  const score = Math.min(100, Math.round([...contributions.values()].reduce((sum, value) => sum + value, 0)));
  return { score, confirmed: contributions.size >= 2 && score >= options.threshold, groups: [...contributions.keys()] };
}

/** Stateful confirmation, recovery debounce and per-episode cooldown, using a monotonic clock. */
export class DetectionState {
  active = false;
  private candidateAt: number | undefined;
  private clearAt: number | undefined;
  private lastDetection = -Infinity;

  constructor(private readonly options: { debounce: number; clearDebounce: number; cooldown: number }) {}

  update(confirmed: boolean, now: number): 'detected' | 'cleared' | undefined {
    if (confirmed) {
      this.clearAt = undefined;
      this.candidateAt ??= now;
      if (!this.active && now - this.candidateAt >= this.options.debounce && now - this.lastDetection >= this.options.cooldown) {
        this.active = true;
        this.lastDetection = now;
        return 'detected';
      }
    } else {
      this.candidateAt = undefined;
      this.clearAt ??= now;
      if (this.active && now - this.clearAt >= this.options.clearDebounce) {
        this.active = false;
        return 'cleared';
      }
    }
    return undefined;
  }

  interrupt(): void {
    this.candidateAt = undefined;
    this.clearAt = undefined;
  }

  reset(preserveCooldown = false): void {
    this.active = false;
    this.interrupt();
    if (!preserveCooldown) this.lastDetection = -Infinity;
  }
}
