export interface BrowserContext {
  window: Window & typeof globalThis;
  document: Document;
  now: () => number;
  clock: () => number;
}

export function getBrowserContext(): BrowserContext | undefined {
  if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
  return { window, document, now: () => Date.now(), clock: () => window.performance.now() };
}

export function isForeground(context: BrowserContext): boolean {
  return context.document.visibilityState === 'visible' && context.document.hasFocus();
}

export function safeHttpUrl(value: string, context: BrowserContext, crossOrigin = false): URL {
  const base = context.window.location.href;
  const url = new URL(value, base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new TypeError('Only HTTP(S) URLs without embedded credentials are allowed');
  }
  if (!crossOrigin && url.origin !== new URL(base).origin) {
    throw new TypeError('Cross-origin URLs require explicit reporting opt-in; redirects must be same-origin');
  }
  return url;
}
