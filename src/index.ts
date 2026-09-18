import { SecurityGuardInstance } from './guard';

/** Shared convenience instance. For framework components prefer createSecurityGuard() or createDevToolGuard(). */
const SecurityGuard = new SecurityGuardInstance();
const DevToolGuard = SecurityGuard;

/** Create an isolated guard; no browser work occurs until start(). */
export function createSecurityGuard(): SecurityGuardInstance { return new SecurityGuardInstance(); }
export function createDevToolGuard(): SecurityGuardInstance { return new SecurityGuardInstance(); }

export default SecurityGuard;
export { SecurityGuard, SecurityGuardInstance, DevToolGuard };
export { resolveConfig } from './config';
export type {
  DetectionSignal, DetectorName, EvidenceGroup, EventHandler, EventName, GuardStatus,
  LayerOptions, ReportingConfig, ResolvedConfig, SecurityAction, SecurityEvent,
  SecurityEventMap, SecurityEventType, SecurityGuardConfig, Sensitivity,
} from './types';
