import { safeHttpUrl, type BrowserContext } from '../environment';
import type { ActionHandle } from './layer';

export function redirect(context: BrowserContext, url: string): ActionHandle {
  const destination = safeHttpUrl(url, context);
  if (destination.href !== context.window.location.href) context.window.location.replace(destination.href);
  return { blocked: false, cleanup: () => undefined };
}
