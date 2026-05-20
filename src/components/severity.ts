/**
 * Shared severity model for the Overlord system (DESIGN.md section 8).
 * Used by both Alert levels and Panel severity rails.
 */
export const SEVERITY_LEVELS = ['info', 'success', 'warning', 'critical', 'unknown'] as const;

export type Severity = (typeof SEVERITY_LEVELS)[number];

/** The status word shown for each severity, per the DESIGN.md alert table. */
export const SEVERITY_LABELS: Record<Severity, string> = {
  info: 'SYSTEM',
  success: 'CONFIRMED',
  warning: 'DEGRADED',
  critical: 'BREACH',
  unknown: 'UNVERIFIED',
};
