import { Button } from '../components/Button';
import { Label } from '../components/Text';
import type { StoredTrip } from './recentTripsStore';
import styles from './RecentTrips.module.css';

type RecentTripsProps = {
  trips: StoredTrip[];
  onSelect: (trip: StoredTrip) => void;
  onClear: () => void;
};

/** On-device recent trips; selecting one repopulates the query form. */
export function RecentTrips({ trips, onSelect, onClear }: RecentTripsProps) {
  if (trips.length === 0) return null;

  return (
    <section className={styles.recent} aria-label="Recent trips">
      <div className={styles.header}>
        <Label>Recent</Label>
        <button type="button" className={styles.clear} onClick={onClear}>
          CLEAR
        </button>
      </div>
      <ul className={styles.list}>
        {trips.map((trip) => (
          <li key={`${trip.origin.sourceStopId}>${trip.destination.sourceStopId}`}>
            <Button variant="secondary" onClick={() => onSelect(trip)}>
              {trip.origin.name} → {trip.destination.name}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
