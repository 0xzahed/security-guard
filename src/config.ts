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
  const type = typeof action === 'string' ? action : action.type;
  if (!['overlay', 'block', 'redirect', 'callback'].includes(type)) {
    throw new TypeError('Unknown security action');
  }
  if (typeof action !== 'string' && action.type === 'callback' && typeof action.handler !== 'function') {
    throw new TypeError('Callback action requires a handler');
  }
  if (typeof action !== 'string' && action.type === 'redirect' && !action.url?.trim()) {
    throw new TypeError('Redirect action requires a URL');
  }
}

/** Resolve and validate configuration without accessing any browser globals. */
export function resolveConfig(config: SecurityGuardConfig = {}): ResolvedConfig {
  const sensitivity = config.sensitivity ?? 'medium';
  if (!Object.hasOwn(presets, sensitivity)) throw new TypeError('Unknown sensitivity preset');
  const preset = presets[sensitivity];
  const devtools = typeof config.devtools === 'object' ? config.devtools : {};
  const weights = { dimension: 20, debugger: 40, keyboard: 15, behavior: 25, ...config.scoring?.weights };
  for (const [name, weight] of Object.entries(weights)) numberOption(`weights.${name}`, weight, 0, 100);
  const action = config.action ?? 'overlay';
  validateAction(action);
  const reporting = config.reporting ? { ...config.reporting } : false;
  if (reporting) {
    if (!reporting.endpoint?.trim()) throw new TypeError('Reporting requires an endpoint');
    reporting.timeout = numberOption('reporting.timeout', reporting.timeout ?? 3000, 100, 30000);
    if (reporting.pathSanitizer !== undefined && typeof reporting.pathSanitizer !== 'function') {
      throw new TypeError('reporting.pathSanitizer must be a function');
    }
  }
  if (config.onDetected !== undefined && typeof config.onDetected !== 'function') {
    throw new TypeError('onDetected must be a function');
  }
  const interval = numberOption('interval', devtools.interval ?? 1000, 250, 60000);
  return {
    enabled: config.devtools !== false && devtools.enabled !== false,
    sensitivity,
    interval,
    threshold: numberOption('threshold', config.scoring?.threshold ?? devtools.threshold ?? preset.threshold, 1, 100),
    weights,
    debugger: {
      enabled: config.debugger?.enabled ?? false,
      interval: numberOption('debugger.interval', config.debugger?.interval ?? 15000, 5000, 300000),
      delayThreshold: numberOption('debugger.delayThreshold', config.debugger?.delayThreshold ?? 1500, 100, 60000),
    },
    keyboard: config.keyboard?.enabled ?? true,
    behavior: {
      enabled: config.behavior?.enabled ?? true,
      delayThreshold: numberOption('behavior.delayThreshold', config.behavior?.delayThreshold ?? 1500, 500, 60000),
    },
    dimension: { gap: preset.gap, settleTime: preset.settleTime },
    debounce: numberOption('debounce', config.debounce ?? 1000, 0, 60000),
    clearDebounce: numberOption('clearDebounce', config.clearDebounce ?? 2000, 0, 60000),
    cooldown: numberOption('cooldown', config.cooldown ?? 30000, 0, 3600000),
    signalTtl: numberOption('signalTtl', config.signalTtl ?? Math.max(10000, interval * 2), Math.max(interval * 2, 1000), 300000),
    action: typeof action === 'string' ? action : { ...action },
    reporting,
    onDetected: config.onDetected,
  };
}
