import type { EventHandler, EventName, SecurityEvent } from './types';

export function copyEvent(event: SecurityEvent): SecurityEvent {
  return { ...event, signals: event.signals.map(signal => ({ ...signal, ...(signal.metadata ? { metadata: { ...signal.metadata } } : {}) })) };
}

export function safelyInvoke(handler: EventHandler | undefined, event: SecurityEvent): void {
  try {
    const result: unknown = handler?.(copyEvent(event));
    if (result instanceof Promise) void result.catch(() => undefined);
  } catch { /* Developer callbacks must not interrupt guard cleanup or other subscribers. */ }
}

export class EventBus {
  private readonly handlers = new Map<EventName, Set<EventHandler>>();

  on(name: EventName, handler: EventHandler): () => void {
    let set = this.handlers.get(name);
    if (!set) { set = new Set(); this.handlers.set(name, set); }
    set.add(handler);
    return () => this.off(name, handler);
  }

  off(name: EventName, handler: EventHandler): void {
    const set = this.handlers.get(name);
    set?.delete(handler);
    if (set?.size === 0) this.handlers.delete(name);
  }

  emit(name: EventName, event: SecurityEvent): void {
    for (const handler of [...(this.handlers.get(name) ?? [])]) safelyInvoke(handler, event);
  }
}
