import { useCallback, useState } from 'react';
import {
  addRecentTrip,
  clearRecentTrips,
  loadRecentTrips,
  type StoredTrip,
} from './recentTripsStore';

/** React access to the on-device recent-trips list. */
export function useRecentTrips() {
  const [trips, setTrips] = useState<StoredTrip[]>(() => loadRecentTrips());

  const add = useCallback((trip: StoredTrip) => {
    setTrips(addRecentTrip(trip));
  }, []);

  const clear = useCallback(() => {
    clearRecentTrips();
    setTrips([]);
  }, []);

  return { trips, add, clear };
}
