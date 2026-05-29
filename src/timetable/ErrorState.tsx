import { Panel } from '../components/Panel';
import { Mono } from '../components/Text';
import { SEVERITY_LABELS } from '../components/severity';
import { TimetableLoadError, type LoadStage } from './loader';
import styles from './ErrorState.module.css';

type ErrorStateProps = {
  /** The load failure to render. */
  error: TimetableLoadError | Error;
  /** ISO timestamp shown in the panel header. Defaults to now() on render. */
  timestamp?: string;
  /** When true, frame the fault as a connectivity problem with no cached schedule. */
  offline?: boolean;
};

const STAGE_LABELS: Record<LoadStage, string> = {
  fetch: 'STAGE:FETCH',
  deserialize: 'STAGE:DECODE',
  router: 'STAGE:ROUTER',
};

/**
 * Actionable, voice-on-brand hint per failure. Offline takes precedence —
 * there's nothing cached, so a reload won't help until the connection is back.
 */
function buildHint(error: TimetableLoadError | Error, offline: boolean): string {
  if (offline) return 'NO CONNECTION // CACHED PLANNER UNAVAILABLE — RECONNECT TO RETRY';
  if (error instanceof TimetableLoadError) {
    switch (error.stage) {
      case 'fetch':
        return 'SCHEDULE SERVICE UNREACHABLE // CHECK CONNECTION OR RELOAD';
      case 'deserialize':
        return 'SCHEDULE DATA CORRUPT // RELOAD TO RETRY';
      case 'router':
        return 'PLANNER FAILED TO START // RELOAD TO RETRY';
    }
  }
  return 'SYSTEM HALTED // RELOAD TO RETRY';
}

/**
 * Factual fault screen rendered when the timetable load fails. Uses the
 * critical (BREACH) severity rail per DESIGN.md §8 and reports the stage,
 * message, and timestamp without diagnostic narration.
 */
export function ErrorState({ error, timestamp, offline = false }: ErrorStateProps) {
  const stamp = timestamp ?? new Date().toISOString();
  const identifier = offline
    ? 'LINK:OFFLINE'
    : error instanceof TimetableLoadError
      ? STAGE_LABELS[error.stage]
      : 'STAGE:UNKNOWN';
  const hint = buildHint(error, offline);

  return (
    <Panel
      title="ROUTING SUBSYSTEM FAULT"
      identifier={identifier}
      status={SEVERITY_LABELS.critical}
      timestamp={stamp}
      severity="critical"
    >
      <div className={styles.body} role="alert">
        <p className={styles.message}>{error.message}</p>
        <p className={styles.hint}>
          <Mono>{hint}</Mono>
        </p>
      </div>
    </Panel>
  );
}
