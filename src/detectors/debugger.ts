import { isForeground, type BrowserContext } from '../environment';
import type { DetectionSignal } from '../types';
import { freshSignal, type Detector, signal } from './shared';

/** Opt-in only: an attached debugger can pause this statement indefinitely. Timing is not proof of inspection. */
export class DebuggerDetector implements Detector {
  readonly name = 'debugger';
  readonly group = 'timing';
  private nextProbe = Infinity;
  private cached: DetectionSignal | undefined;

  constructor(private readonly context: BrowserContext, private readonly options: { interval: number; delayThreshold: number; ttl: number }) {}

  start(): void { this.nextProbe = this.context.clock() + this.options.interval; }

  sample(): DetectionSignal {
    if (isForeground(this.context) && this.context.clock() >= this.nextProbe) {
      const start = this.context.clock();
      debugger;
      const duration = this.context.clock() - start;
      this.nextProbe = this.context.clock() + this.options.interval;
      if (duration >= this.options.delayThreshold && isForeground(this.context)) {
        this.cached = signal(this.context, this.name, true, { delayMs: Math.round(duration) });
      }
    }
    return freshSignal(this.context, this.name, this.cached, this.options.ttl);
  }

  stop(): void { this.nextProbe = Infinity; this.cached = undefined; }
}
