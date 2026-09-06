import { runAction, type ActionHandle } from './actions';
import { resolveConfig } from './config';
import { BehaviorDetector, DebuggerDetector, DimensionDetector, KeyboardDetector, type Detector } from './detectors';
import { getBrowserContext, isForeground, safeHttpUrl, type BrowserContext } from './environment';
import { EventBus, safelyInvoke } from './events';
import { Reporter } from './reporting';
import { calculateScore, DetectionState } from './scoring';
import type { DetectionSignal, EventHandler, EventName, GuardStatus, ResolvedConfig, SecurityEvent, SecurityGuardConfig } from './types';

/** Independently managed guard. Constructing or importing is safe during SSR. */
export class SecurityGuardInstance {
  private readonly events = new EventBus();
  private config: ResolvedConfig = resolveConfig();
  private context: BrowserContext | undefined;
  private detectors: Detector[] = [];
  private behavior: BehaviorDetector | undefined;
  private state = new DetectionState(this.config);
  private reporter: Reporter | undefined;
  private action: ActionHandle | undefined;
  private timer: number | undefined;
  private lifecycle: GuardStatus['lifecycle'] = 'stopped';
  private score = 0;
  private signals: DetectionSignal[] = [];
  private observing = false;
  private revision = 0;
  private readonly onAvailability = (): void => {
    if (this.lifecycle !== 'running' || !this.context) return;
    if (isForeground(this.context) && this.context.document.body) this.beginObserving();
    else this.endObserving();
  };

  /** Replace configuration and start. Invalid configuration leaves an existing guard untouched. */
  start(config: SecurityGuardConfig = {}): this {
    const resolved = resolveConfig(config);
    const context = getBrowserContext();
    if (context && typeof resolved.action !== 'string' && resolved.action.type === 'redirect') {
      safeHttpUrl(resolved.action.url, context);
    }
    const reporter = context && resolved.reporting && resolved.reporting.enabled !== false
      ? new Reporter(context, resolved.reporting) : undefined;
    this.stop();
    this.config = resolved;
    this.state = new DetectionState(resolved);
    this.context = context;
    this.reporter = reporter;
    if (!context) { this.lifecycle = 'unsupported'; return this; }
    if (!resolved.enabled) return this;
    this.lifecycle = 'running';
    this.detectors = [new DimensionDetector(context, resolved.dimension)];
    if (resolved.keyboard) this.detectors.push(new KeyboardDetector(context, resolved.signalTtl));
    if (resolved.behavior.enabled) {
      this.behavior = new BehaviorDetector(context, { ...resolved.behavior, interval: resolved.interval, ttl: resolved.signalTtl });
      this.detectors.push(this.behavior);
    }
    if (resolved.debugger.enabled) this.detectors.push(new DebuggerDetector(context, { ...resolved.debugger, ttl: resolved.signalTtl }));
    context.window.addEventListener('focus', this.onAvailability);
    context.window.addEventListener('blur', this.onAvailability);
    context.document.addEventListener('visibilitychange', this.onAvailability);
    context.document.addEventListener('DOMContentLoaded', this.onAvailability);
    this.onAvailability();
    return this;
  }

  private beginObserving(): void {
    if (this.observing || !this.context) return;
    this.observing = true;
    for (const detector of this.detectors) detector.start();
    this.schedule();
  }

  private endObserving(): void {
    this.observing = false;
    if (this.timer !== undefined) this.context?.window.clearTimeout(this.timer);
    this.timer = undefined;
    for (const detector of this.detectors) detector.stop();
    this.score = 0;
    this.signals = [];
    this.state.interrupt();
  }

  private schedule(): void {
    if (!this.observing || this.lifecycle !== 'running' || this.timer !== undefined) return;
    this.timer = this.context?.window.setTimeout(() => { this.timer = undefined; this.tick(); }, this.config.interval);
  }

  private tick(): void {
    const context = this.context;
    if (!context || this.lifecycle !== 'running') return;
    if (!isForeground(context)) { this.endObserving(); return; }
    const revision = this.revision;
    try {
      this.signals = this.detectors.map(detector => detector.sample());
      const result = calculateScore(this.signals, this.config, context.now());
      this.score = result.score;
      const transition = this.state.update(result.confirmed, context.clock());
      if (transition === 'detected') this.detected(revision);
      if (transition === 'cleared') {
        this.action?.cleanup();
        this.action = undefined;
        this.events.emit('cleared', this.event('DEVTOOLS_CLEARED'));
      }
    } finally {
      if (revision === this.revision) { this.behavior?.checkpoint(); this.schedule(); }
    }
  }

  private event(type: SecurityEvent['type']): SecurityEvent {
    return { type, confidence: this.score, signals: this.signals, timestamp: this.context?.now() ?? Date.now(), path: this.context?.window.location.pathname ?? '' };
  }

  private detected(revision: number): void {
    const event = this.event('DEVTOOLS_DETECTED');
    const current = (): boolean => this.revision === revision && this.lifecycle === 'running';
    this.events.emit('detected', event);
    if (!current()) return;
    safelyInvoke(this.config.onDetected, event);
    if (!current()) return;
    this.events.emit('violation', { ...event, type: 'SECURITY_VIOLATION' });
    if (!current() || !this.context) return;
    this.reporter?.send(event);
    const handle = runAction(this.context, this.config.action, event);
    if (current()) this.action = handle;
    else handle.cleanup();
  }

  /** Remove all SDK browser listeners, timers, pending requests and action layers. Subscriptions persist. */
  stop(): void {
    this.revision++;
    this.endObserving();
    const context = this.context;
    context?.window.removeEventListener('focus', this.onAvailability);
    context?.window.removeEventListener('blur', this.onAvailability);
    context?.document.removeEventListener('visibilitychange', this.onAvailability);
    context?.document.removeEventListener('DOMContentLoaded', this.onAvailability);
    this.reporter?.stop();
    this.action?.cleanup();
    this.action = undefined;
    this.reporter = undefined;
    this.detectors = [];
    this.behavior = undefined;
    this.context = undefined;
    this.state.reset();
    this.lifecycle = 'stopped';
  }

  /** Suspend observation, abort reports and remove actions. Event subscriptions and configuration persist. */
  pause(): void {
    if (this.lifecycle !== 'running') return;
    this.revision++;
    this.lifecycle = 'paused';
    this.endObserving();
    this.reporter?.stop();
    this.action?.cleanup();
    this.action = undefined;
    this.state.reset(true);
  }

  /** Resume a paused instance with fresh evidence and the previous cooldown. */
  resume(): void {
    if (this.lifecycle !== 'paused') return;
    this.revision++;
    this.lifecycle = 'running';
    this.onAvailability();
  }

  /** Reset detection state and clear evidence without changing lifecycle or config. */
  reset(): void {
    this.revision++;
    this.state.reset();
    this.score = 0;
    this.signals = [];
    this.action?.cleanup();
    this.action = undefined;
  }

  /** Snapshot of lifecycle, current evidence and whether an SDK layer is blocking. */
  getStatus(): GuardStatus {
    return {
      lifecycle: this.lifecycle,
      state: this.action?.blocked ? 'blocked' : this.score > 0 || this.state.active ? 'suspicious' : 'normal',
      detected: this.state.active,
      score: this.score,
      signals: this.signals.map(signal => ({ ...signal, ...(signal.metadata ? { metadata: { ...signal.metadata } } : {}) })),
    };
  }

  /** A heuristic score from 0–100, not a calibrated probability. */
  getScore(): number { return this.score; }

  /** Subscribe and receive an unsubscribe function. Listener exceptions are isolated. */
  on(name: EventName, handler: EventHandler): () => void { return this.events.on(name, handler); }

  /** Remove a previously registered subscriber. */
  off(name: EventName, handler: EventHandler): void { this.events.off(name, handler); }
}
