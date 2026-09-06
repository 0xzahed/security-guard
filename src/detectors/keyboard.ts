import type { BrowserContext } from '../environment';
import type { DetectionSignal } from '../types';
import { freshSignal, type Detector, signal } from './shared';

/** Observes delivered inspection shortcuts without cancelling keyboard events or reading input values. */
export class KeyboardDetector implements Detector {
  readonly name = 'keyboard';
  readonly group = 'interaction';
  private cached: DetectionSignal | undefined;
  private active = false;
  private readonly onKey = (event: KeyboardEvent): void => {
    if (!event.isTrusted || event.repeat || event.isComposing) return;
    const key = event.key.toLowerCase();
    const f12 = key === 'f12' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
    const control = event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && ['i', 'j', 'c'].includes(key);
    const command = event.metaKey && event.altKey && !event.ctrlKey && !event.shiftKey && ['i', 'j', 'c'].includes(key);
    if (f12 || control || command) this.cached = signal(this.context, this.name, true, { shortcut: f12 ? 'F12' : 'inspection-shortcut' });
  };

  constructor(private readonly context: BrowserContext, private readonly ttl: number) {}

  start(): void {
    if (this.active) return;
    this.active = true;
    this.context.window.addEventListener('keydown', this.onKey, true);
  }

  sample(): DetectionSignal { return freshSignal(this.context, this.name, this.cached, this.ttl); }

  stop(): void {
    this.active = false;
    this.cached = undefined;
    this.context.window.removeEventListener('keydown', this.onKey, true);
  }
}
