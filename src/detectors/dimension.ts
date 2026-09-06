import type { BrowserContext } from '../environment';
import type { DetectionSignal } from '../types';
import type { Detector } from './shared';
import { signal } from './shared';

/** Stable outer/inner gaps only; browser chrome, sidebars and responsive emulation can look identical. */
export class DimensionDetector implements Detector {
  readonly name = 'dimension';
  readonly group = 'layout';
  private changedAt = 0;
  private pixelRatio = 1;
  private active = false;
  private readonly onResize = (): void => { this.changedAt = this.context.clock(); };

  constructor(private readonly context: BrowserContext, private readonly options: { gap: number; settleTime: number }) {}

  start(): void {
    if (this.active) return;
    this.active = true;
    this.pixelRatio = this.context.window.devicePixelRatio;
    this.changedAt = this.context.clock();
    this.context.window.addEventListener('resize', this.onResize);
    this.context.window.addEventListener('orientationchange', this.onResize);
    this.context.window.visualViewport?.addEventListener('resize', this.onResize);
  }

  sample(): DetectionSignal {
    const win = this.context.window;
    const scale = win.visualViewport?.scale ?? 1;
    const coarse = win.matchMedia?.('(pointer: coarse)').matches ?? false;
    if (!this.active || coarse || win.innerWidth < 768 || Math.abs(scale - 1) > 0.05 || win.devicePixelRatio !== this.pixelRatio) {
      return signal(this.context, this.name);
    }
    if (this.context.clock() - this.changedAt < this.options.settleTime) return signal(this.context, this.name);
    const widthGap = Math.max(0, win.outerWidth - win.innerWidth);
    const heightGap = Math.max(0, win.outerHeight - win.innerHeight);
    return signal(this.context, this.name, widthGap > this.options.gap || heightGap > this.options.gap, { widthGap, heightGap });
  }

  stop(): void {
    this.active = false;
    this.context.window.removeEventListener('resize', this.onResize);
    this.context.window.removeEventListener('orientationchange', this.onResize);
    this.context.window.visualViewport?.removeEventListener('resize', this.onResize);
  }
}
