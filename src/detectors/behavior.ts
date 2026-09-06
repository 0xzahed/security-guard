import { isForeground, type BrowserContext } from '../environment';
import type { DetectionSignal } from '../types';
import { freshSignal, type Detector, signal } from './shared';

/** Foreground scheduling stalls also arise from GC, sleep and CPU load; this shares the debugger timing category. */
export class BehaviorDetector implements Detector {
  readonly name = 'behavior';
  readonly group = 'timing';
  private previous: number | undefined;
  private cached: DetectionSignal | undefined;
  private active = false;
  private readonly reset = (): void => { this.previous = undefined; this.cached = undefined; };

  constructor(private readonly context: BrowserContext, private readonly options: { interval: number; delayThreshold: number; ttl: number }) {}

  start(): void {
    if (this.active) return;
    this.active = true;
    this.reset();
    this.context.window.addEventListener('blur', this.reset);
    this.context.window.addEventListener('focus', this.reset);
    this.context.document.addEventListener('visibilitychange', this.reset);
  }

  sample(): DetectionSignal {
    const now = this.context.clock();
    if (!this.active || !isForeground(this.context)) {
      this.reset();
      return signal(this.context, this.name);
    }
    const drift = this.previous === undefined ? 0 : now - this.previous - this.options.interval;
    this.previous = now;
    if (drift >= this.options.delayThreshold && drift <= 10000) {
      this.cached = signal(this.context, this.name, true, { delayMs: Math.round(drift) });
    }
    return freshSignal(this.context, this.name, this.cached, this.options.ttl);
  }

  /** Exclude time spent in the SDK's own synchronous work and debugger probe. */
  checkpoint(): void { if (this.previous !== undefined) this.previous = this.context.clock(); }

  stop(): void {
    this.active = false;
    this.reset();
    this.context.window.removeEventListener('blur', this.reset);
    this.context.window.removeEventListener('focus', this.reset);
    this.context.document.removeEventListener('visibilitychange', this.reset);
  }
}
