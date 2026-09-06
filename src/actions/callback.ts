import { safelyInvoke } from '../events';
import type { EventHandler, SecurityEvent } from '../types';
import type { ActionHandle } from './layer';

export function callback(handler: EventHandler, event: SecurityEvent): ActionHandle {
  safelyInvoke(handler, event);
  return { blocked: false, cleanup: () => undefined };
}
