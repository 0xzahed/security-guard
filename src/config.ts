import type { ResolvedConfig, SecurityAction, SecurityGuardConfig, Sensitivity } from './types';

const presets: Record<Sensitivity, { threshold: number; gap: number; settleTime: number }> = {
  low: { threshold: 75, gap: 220, settleTime: 3000 },
  medium: { threshold: 60, gap: 180, settleTime: 2000 },
  high: { threshold: 50, gap: 150, settleTime: 1500 },
};

function numberOption(name: string, value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be a finite number between ${min} and ${max}`);
  }
  return value;
}

function validateAction(action: SecurityAction): void {
  if (typeof action === 'string') {
    if (action !== 'overlay' && action !== 'block') {
      throw new TypeError('Unknown security action');
    }
    return;
  }
  if (typeof action !== 'object' || action === null) {
    throw new TypeError('Unknown security action');
  }
  if (!['overlay', 'block', 'redirect', 'callback'].includes(action.type)) {
    throw new TypeError('Unknown security action');
  }
  if (action.type === 'callback' && typeof action.handler !== 'function') {
    throw new TypeError('Callback action requires a handler');
  }
  if (action.type === 'redirect' && (typeof action.url !== 'string' || !action.url.trim())) {
    throw new TypeError('Redirect action requires a URL');
  }
}

/** Resolve and validate configuration without accessing any browser globals. */
export function resolveConfig(config: SecurityGuardConfig = {}): ResolvedConfig {
  const cfg = config ?? {};
  const sensitivity = cfg.sensitivity ?? 'medium';
  if (!Object.hasOwn(presets, sensitivity)) throw new TypeError('Unknown sensitivity preset');
  const preset = presets[sensitivity];
  const devtools = typeof cfg.devtools === 'object' && cfg.devtools !== null ? cfg.devtools : {};
  const dbg = typeof cfg.debugger === 'object' && cfg.debugger !== null ? cfg.debugger : {};
  const kb = typeof cfg.keyboard === 'object' && cfg.keyboard !== null ? cfg.keyboard : {};
  const beh = typeof cfg.behavior === 'object' && cfg.behavior !== null ? cfg.behavior : {};
  if (cfg.scoring?.weights) {
    for (const key of Object.keys(cfg.scoring.weights)) {
      if (!['dimension', 'debugger', 'keyboard', 'behavior'].includes(key)) {
        throw new TypeError(`Unknown detector weight: ${key}`);
      }
    }
  }
  const weights = { dimension: 20, debugger: 40, keyboard: 15, behavior: 25, ...cfg.scoring?.weights };
  for (const [name, weight] of Object.entries(weights)) numberOption(`weights.${name}`, weight, 0, 100);
  const action = cfg.action ?? 'overlay';
  validateAction(action);
  const reporting = cfg.reporting ? { ...cfg.reporting } : false;
  if (reporting) {
    if (typeof reporting.endpoint !== 'string' || !reporting.endpoint.trim()) {
      throw new TypeError('Reporting requires a valid endpoint URL string');
    }
    reporting.timeout = numberOption('reporting.timeout', reporting.timeout ?? 3000, 100, 30000);
    if (reporting.pathSanitizer !== undefined && typeof reporting.pathSanitizer !== 'function') {
      throw new TypeError('reporting.pathSanitizer must be a function');
    }
  }
  if (cfg.onDetected !== undefined && typeof cfg.onDetected !== 'function') {
    throw new TypeError('onDetected must be a function');
  }
  const interval = numberOption('interval', devtools.interval ?? 1000, 250, 60000);
  return {
    enabled: cfg.devtools !== false && devtools.enabled !== false,
    sensitivity,
    interval,
    threshold: numberOption('threshold', cfg.scoring?.threshold ?? devtools.threshold ?? preset.threshold, 1, 100),
    weights,
    debugger: {
      enabled: typeof cfg.debugger === 'boolean' ? cfg.debugger : (dbg.enabled ?? false),
      interval: numberOption('debugger.interval', dbg.interval ?? 15000, 5000, 300000),
      delayThreshold: numberOption('debugger.delayThreshold', dbg.delayThreshold ?? 1500, 100, 60000),
    },
    keyboard: typeof cfg.keyboard === 'boolean' ? cfg.keyboard : (kb.enabled ?? true),
    behavior: {
      enabled: typeof cfg.behavior === 'boolean' ? cfg.behavior : (beh.enabled ?? true),
      delayThreshold: numberOption('behavior.delayThreshold', beh.delayThreshold ?? 1500, 500, 60000),
    },
    dimension: { gap: preset.gap, settleTime: preset.settleTime },
    debounce: numberOption('debounce', cfg.debounce ?? 1000, 0, 60000),
    clearDebounce: numberOption('clearDebounce', cfg.clearDebounce ?? 2000, 0, 60000),
    cooldown: numberOption('cooldown', cfg.cooldown ?? 30000, 0, 3600000),
    signalTtl: numberOption('signalTtl', cfg.signalTtl ?? Math.max(10000, interval * 2), Math.max(interval * 2, 1000), 300000),
    action: typeof action === 'string' ? action : { ...action },
    reporting,
    onDetected: cfg.onDetected,
  };
}
