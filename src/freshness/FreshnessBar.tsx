import { Button } from '../components/Button';
import { Label, Mono } from '../components/Text';
import { formatTime, nycDateString } from '../routing';
import styles from './FreshnessBar.module.css';

type FreshnessBarProps = {
  /** When the loaded schedule window was published (ISO-8601). */
  feedPublishedAt: string;
  /** When the live overlay was last generated (ISO-8601), or null if none yet. */
  liveUpdatedAt?: string | null;
  /** Browser connectivity. */
  online: boolean;
  /** True while a manual refresh is in flight. */
  refreshing: boolean;
  /** Trigger an on-request refresh of the live overlay and schedule. */
  onRefresh: () => void;
};

function formatStamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : formatTime(date);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : nycDateString(date);
}

/**
 * Status strip reporting schedule + live data freshness and connectivity, with
 * an on-request refresh. Answers "is this current, and when was it loaded?"
 * (DESIGN.md §16 principle 1: show state before explanation).
 */
export function FreshnessBar({
  feedPublishedAt,
  liveUpdatedAt,
  online,
  refreshing,
  onRefresh,
}: FreshnessBarProps) {
  return (
    <section className={styles.bar} aria-label="Data freshness">
      <div className={styles.field}>
        <Label>Schedule</Label>
        <Mono>{formatDate(feedPublishedAt)}</Mono>
      </div>
      <div className={styles.field}>
        <Label>Live</Label>
        <Mono>{online ? formatStamp(liveUpdatedAt) : 'OFFLINE'}</Mono>
      </div>
      <span
        className={styles.status}
        data-online={online}
        role="status"
        aria-label={online ? 'Online' : 'Offline'}
      >
        {online ? 'ONLINE' : 'OFFLINE'}
      </span>
      <Button
        variant="secondary"
        onClick={onRefresh}
        disabled={refreshing || !online}
        aria-busy={refreshing}
      >
        {refreshing ? 'REFRESHING...' : 'REFRESH'}
      </Button>
    </section>
  );
}
