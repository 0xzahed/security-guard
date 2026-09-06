import { SecurityGuardInstance } from './guard';

/** Shared convenience instance. For framework components prefer createSecurityGuard(). */
const SecurityGuard = new SecurityGuardInstance();

/** Create an isolated guard; no browser work occurs until start(). */
export function createSecurityGuard(): SecurityGuardInstance { return new SecurityGuardInstance(); }

export default SecurityGuard;
export { SecurityGuard, SecurityGuardInstance };
export { resolveConfig } from './config';
export type {
  DetectionSignal, DetectorName, EvidenceGroup, EventHandler, EventName, GuardStatus,
  LayerOptions, ReportingConfig, ResolvedConfig, SecurityAction, SecurityEvent,
  SecurityEventMap, SecurityEventType, SecurityGuardConfig, Sensitivity,
} from './types';
