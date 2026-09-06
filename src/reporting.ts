import { safeHttpUrl, type BrowserContext } from './environment';
import type { ReportingConfig, SecurityEvent } from './types';

export class Reporter {
  private readonly pending = new Map<AbortController, number>();
  private readonly endpoint: string;

  constructor(private readonly context: BrowserContext, private readonly options: ReportingConfig) {
    this.endpoint = safeHttpUrl(options.endpoint, context, options.allowCrossOrigin ?? false).href;
  }

  send(event: SecurityEvent): void {
    const win = this.context.window;
    if (this.options.enabled === false || typeof win.fetch !== 'function' || this.pending.size >= 2) return;
    let controller: AbortController | undefined;
    try {
      const payload = {
        type: event.type,
        confidence: event.confidence,
        timestamp: event.timestamp,
        ...(this.options.includePath ? { path: this.options.pathSanitizer?.(event.path) ?? event.path } : {}),
      };
      controller = new win.AbortController();
      const current = controller;
      const timeout = win.setTimeout(() => { current.abort(); this.finish(current); }, this.options.timeout ?? 3000);
      this.pending.set(current, timeout);
      void win.fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: current.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        redirect: 'error',
      }).catch(() => undefined).finally(() => this.finish(current));
    } catch {
      if (controller) { controller.abort(); this.finish(controller); }
    }
  }

  private finish(controller: AbortController): void {
    const timer = this.pending.get(controller);
    if (timer !== undefined) this.context.window.clearTimeout(timer);
    this.pending.delete(controller);
  }

  stop(): void {
    for (const controller of this.pending.keys()) { controller.abort(); this.finish(controller); }
  }
}
