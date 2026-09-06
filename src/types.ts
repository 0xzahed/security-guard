/** A heuristic observation, not proof that Developer Tools are open. */
export interface DetectionSignal {
  name: string;
  detected: boolean;
  confidence: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type EvidenceGroup = 'layout' | 'timing' | 'interaction';
export type DetectorName = 'dimension' | 'debugger' | 'keyboard' | 'behavior';
export type Sensitivity = 'low' | 'medium' | 'high';
export type SecurityEventType = 'DEVTOOLS_DETECTED' | 'DEVTOOLS_CLEARED' | 'SECURITY_VIOLATION';

/** Local event data. Paths may contain personal information; do not log blindly. */
export interface SecurityEvent {
  type: SecurityEventType;
  confidence: number;
  signals: DetectionSignal[];
  timestamp: number;
  path: string;
}

export interface SecurityEventMap {
  detected: SecurityEvent;
  cleared: SecurityEvent;
  violation: SecurityEvent;
}

export type EventName = keyof SecurityEventMap;
export type EventHandler = (event: SecurityEvent) => void;

export interface LayerOptions {
  title?: string;
  message?: string;
  buttonLabel?: string;
}

export type SecurityAction =
  | 'overlay'
  | 'block'
  | ({ type: 'overlay' | 'block' } & LayerOptions)
  | { type: 'redirect'; url: string }
  | { type: 'callback'; handler: EventHandler };

export interface ReportingConfig {
  endpoint: string;
  enabled?: boolean;
  timeout?: number;
  allowCrossOrigin?: boolean;
  includePath?: boolean;
  pathSanitizer?: (path: string) => string;
}

/** All detection is heuristic. Keep authorization and credentials on the server. */
export interface SecurityGuardConfig {
  devtools?: boolean | { enabled?: boolean; threshold?: number; interval?: number };
  debugger?: { enabled?: boolean; interval?: number; delayThreshold?: number };
  keyboard?: { enabled?: boolean };
  behavior?: { enabled?: boolean; delayThreshold?: number };
  sensitivity?: Sensitivity;
  scoring?: { threshold?: number; weights?: Partial<Record<DetectorName, number>> };
  debounce?: number;
  clearDebounce?: number;
  cooldown?: number;
  signalTtl?: number;
  action?: SecurityAction;
  reporting?: ReportingConfig | false;
  onDetected?: EventHandler;
}

export interface ResolvedConfig {
  enabled: boolean;
  sensitivity: Sensitivity;
  interval: number;
  threshold: number;
  weights: Record<DetectorName, number>;
  debugger: { enabled: boolean; interval: number; delayThreshold: number };
  keyboard: boolean;
  behavior: { enabled: boolean; delayThreshold: number };
  dimension: { gap: number; settleTime: number };
  debounce: number;
  clearDebounce: number;
  cooldown: number;
  signalTtl: number;
  action: SecurityAction;
  reporting: ReportingConfig | false;
  onDetected: EventHandler | undefined;
}

export interface GuardStatus {
  lifecycle: 'stopped' | 'running' | 'paused' | 'unsupported';
  state: 'normal' | 'suspicious' | 'blocked';
  detected: boolean;
  score: number;
  signals: DetectionSignal[];
}
