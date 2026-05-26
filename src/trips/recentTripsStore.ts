/**
 * Recent trips, persisted on-device only.
 *
 * Stored in `localStorage` as GTFS source stop ids (stable across feed
 * rebuilds, unlike the in-memory numeric StopId) plus display names. Nothing
 * here ever leaves the device — there is no network path (PRD.md §9).
 */

export type TripEndpoint = {
  sourceStopId: string;
  name: string;
};

export type StoredTrip = {
  origin: TripEndpoint;
  destination: TripEndpoint;
};

const STORAGE_KEY = 'ctos.recent-trips';
const MAX_RECENT = 5;

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    // Access can throw in privacy modes / sandboxed contexts.
    return null;
  }
}

function isEndpoint(value: unknown): value is TripEndpoint {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return typeof e.sourceStopId === 'string' && typeof e.name === 'string';
}

function isStoredTrip(value: unknown): value is StoredTrip {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Record<string, unknown>;
  return isEndpoint(t.origin) && isEndpoint(t.destination);
}

function sameTrip(a: StoredTrip, b: StoredTrip): boolean {
  return (
    a.origin.sourceStopId === b.origin.sourceStopId &&
    a.destination.sourceStopId === b.destination.sourceStopId
  );
}

/** Load recent trips, newest first. Returns `[]` on any error or malformed data. */
export function loadRecentTrips(): StoredTrip[] {
  const store = safeStorage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredTrip).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/**
 * Record a trip as the most recent, de-duplicating by origin+destination and
 * capping the list. Returns the new list.
 */
export function addRecentTrip(trip: StoredTrip): StoredTrip[] {
  const next = [trip, ...loadRecentTrips().filter((t) => !sameTrip(t, trip))].slice(0, MAX_RECENT);
  const store = safeStorage();
  if (store) {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Quota or disabled storage: keep the in-memory result, ignore persistence.
    }
  }
  return next;
}

/** Remove all recent trips from storage. */
export function clearRecentTrips(): void {
  const store = safeStorage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
