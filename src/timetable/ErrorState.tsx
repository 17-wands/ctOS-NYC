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
  const hint = offline
    ? 'OFFLINE // NO CACHED SCHEDULE — RECONNECT TO LOAD'
    : 'SYSTEM HALTED // RELOAD TO RETRY';

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
