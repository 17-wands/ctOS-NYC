import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addRecentTrip,
  clearRecentTrips,
  loadRecentTrips,
  type StoredTrip,
} from './recentTripsStore';

const STORAGE_KEY = 'ctos.recent-trips';

function trip(origin: string, destination: string): StoredTrip {
  return {
    origin: { sourceStopId: origin, name: `Origin ${origin}` },
    destination: { sourceStopId: destination, name: `Dest ${destination}` },
  };
}

describe('recentTripsStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('returns an empty list when nothing is stored', () => {
    expect(loadRecentTrips()).toEqual([]);
  });

  it('persists trips newest-first', () => {
    addRecentTrip(trip('A', 'B'));
    addRecentTrip(trip('C', 'D'));
    const loaded = loadRecentTrips();
    expect(loaded.map((t) => t.origin.sourceStopId)).toEqual(['C', 'A']);
  });

  it('de-duplicates by origin+destination, moving the repeat to the front', () => {
    addRecentTrip(trip('A', 'B'));
    addRecentTrip(trip('C', 'D'));
    addRecentTrip(trip('A', 'B'));
    const loaded = loadRecentTrips();
    expect(loaded).toHaveLength(2);
    expect(loaded[0]?.origin.sourceStopId).toBe('A');
  });

  it('caps the list at 5 entries', () => {
    for (const n of ['1', '2', '3', '4', '5', '6']) addRecentTrip(trip(n, 'X'));
    const loaded = loadRecentTrips();
    expect(loaded).toHaveLength(5);
    expect(loaded.map((t) => t.origin.sourceStopId)).toEqual(['6', '5', '4', '3', '2']);
  });

  it('clears all trips', () => {
    addRecentTrip(trip('A', 'B'));
    clearRecentTrips();
    expect(loadRecentTrips()).toEqual([]);
  });

  it('returns [] for malformed JSON without throwing', () => {
    localStorage.setItem(STORAGE_KEY, 'not json{');
    expect(loadRecentTrips()).toEqual([]);
  });

  it('ignores non-array and malformed entries', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nope: true }));
    expect(loadRecentTrips()).toEqual([]);

    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ origin: { name: 'x' } }, trip('A', 'B')]));
    const loaded = loadRecentTrips();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.origin.sourceStopId).toBe('A');
  });
});
