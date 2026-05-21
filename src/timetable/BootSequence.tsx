import { Panel } from '../components/Panel';
import { Mono } from '../components/Text';
import { LOAD_STAGES, type LoadStage } from './loader';
import styles from './BootSequence.module.css';

type BootSequenceProps = {
  /** The stage currently in progress. Stages before it are 'done'; after, 'pending'. */
  stage: LoadStage;
  /** ISO timestamp shown in the panel header. Defaults to now() on render. */
  timestamp?: string;
};

type StageState = 'done' | 'active' | 'pending';

const STAGE_CODES: Record<LoadStage, string> = {
  fetch: 'TRANSMISSION',
  deserialize: 'DECODE',
  router: 'ROUTING NODE',
};

const STAGE_DETAIL: Record<LoadStage, string> = {
  fetch: 'Acquiring transit asset from network.',
  deserialize: 'Decoding protobuf streams.',
  router: 'Initializing in-memory router.',
};

const STATE_LABELS: Record<StageState, string> = {
  done: 'CONFIRMED',
  active: 'IN PROGRESS',
  pending: 'STANDBY',
};

/**
 * Boot/loading screen rendered while the timetable assets load. Segments the
 * pipeline (DESIGN.md §10 "Progress as segmented loading") into the
 * loader's stages and marks the active one.
 */
export function BootSequence({ stage, timestamp }: BootSequenceProps) {
  const stamp = timestamp ?? new Date().toISOString();
  const activeIndex = LOAD_STAGES.indexOf(stage);

  return (
    <Panel
      title="BOOT SEQUENCE"
      identifier="ctOS // ROUTING"
      status={STAGE_CODES[stage]}
      timestamp={stamp}
    >
      <ol className={styles.stages} aria-label="Boot sequence stages">
        {LOAD_STAGES.map((s, i) => {
          const state: StageState =
            i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending';
          return (
            <li key={s} className={styles.stage} data-state={state}>
              <span className={styles.marker} aria-hidden="true" />
              <span className={styles.code}>
                <Mono>{STAGE_CODES[s]}</Mono>
              </span>
              <span className={styles.detail}>{STAGE_DETAIL[s]}</span>
              <span className={styles.state}>{STATE_LABELS[state]}</span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
