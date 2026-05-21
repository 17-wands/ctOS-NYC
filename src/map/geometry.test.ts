import { describe, expect, it } from 'vitest';
import { buildRouteTrace, buildStationMarkers, calculateRouteBounds } from './geometry';
import { createMockStopsIndex } from '../query/__fixtures__/mockStopsIndex';
import type { Itinerary } from '../routing/types';

describe('buildRouteTrace', () => {
  const stopsIndex = createMockStopsIndex();

  it('builds LineString from single-leg itinerary', () => {
    const itinerary: Itinerary = {
      legs: [
        {
          type: 'vehicle',
          fromStopId: 1,
          toStopId: 2,
          fromStopName: '59 St - Columbus Circle',
          toStopName: '14 St - Union Sq',
          departureTime: new Date('2026-05-20T14:30:00Z'),
          arrivalTime: new Date('2026-05-20T15:00:00Z'),
          duration: 30,
          routeName: 'Broadway Express',
          routeShortName: 'Q',
        },
      ],
      departureTime: new Date('2026-05-20T14:30:00Z'),
      arrivalTime: new Date('2026-05-20T15:00:00Z'),
      totalDuration: 30,
      transferCount: 0,
    };

    const trace = buildRouteTrace(itinerary, stopsIndex);

    expect(trace.type).toBe('Feature');
    expect(trace.geometry.type).toBe('LineString');
    expect(trace.geometry.coordinates).toHaveLength(2);
    // Note: StopsIndex uses 0-based array indexing, so stopId 1 → mockStops[1] (14 St)
    expect(trace.geometry.coordinates[0]).toEqual([-73.989951, 40.734673]); // fromStopId 1 → 14 St
    expect(trace.geometry.coordinates[1]).toEqual([-73.987495, 40.75529]); // toStopId 2 → Times Sq
  });

  it('builds LineString from multi-leg itinerary', () => {
    const itinerary: Itinerary = {
      legs: [
        {
          type: 'vehicle',
          fromStopId: 1,
          toStopId: 2,
          fromStopName: '59 St - Columbus Circle',
          toStopName: '14 St - Union Sq',
          departureTime: new Date('2026-05-20T14:30:00Z'),
          arrivalTime: new Date('2026-05-20T15:00:00Z'),
          duration: 30,
        },
        {
          type: 'transfer',
          fromStopId: 2,
          toStopId: 3,
          fromStopName: '14 St - Union Sq',
          toStopName: 'Times Sq-42 St',
          departureTime: new Date('2026-05-20T15:00:00Z'),
          arrivalTime: new Date('2026-05-20T15:05:00Z'),
          duration: 5,
        },
        {
          type: 'vehicle',
          fromStopId: 3,
          toStopId: 4,
          fromStopName: 'Times Sq-42 St',
          toStopName: '125 St',
          departureTime: new Date('2026-05-20T15:10:00Z'),
          arrivalTime: new Date('2026-05-20T15:25:00Z'),
          duration: 15,
        },
      ],
      departureTime: new Date('2026-05-20T14:30:00Z'),
      arrivalTime: new Date('2026-05-20T15:25:00Z'),
      totalDuration: 55,
      transferCount: 1,
    };

    const trace = buildRouteTrace(itinerary, stopsIndex);

    expect(trace.geometry.coordinates).toHaveLength(6); // 3 legs * 2 stops each
  });
});

describe('buildStationMarkers', () => {
  const stopsIndex = createMockStopsIndex();

  it('creates markers for all unique stops', () => {
    const itinerary: Itinerary = {
      legs: [
        {
          type: 'vehicle',
          fromStopId: 1,
          toStopId: 2,
          fromStopName: '59 St - Columbus Circle',
          toStopName: '14 St - Union Sq',
          departureTime: new Date('2026-05-20T14:30:00Z'),
          arrivalTime: new Date('2026-05-20T15:00:00Z'),
          duration: 30,
        },
      ],
      departureTime: new Date('2026-05-20T14:30:00Z'),
      arrivalTime: new Date('2026-05-20T15:00:00Z'),
      totalDuration: 30,
      transferCount: 0,
    };

    const markers = buildStationMarkers(itinerary, stopsIndex);

    expect(markers.type).toBe('FeatureCollection');
    expect(markers.features).toHaveLength(2); // fromStop and toStop
    expect(markers.features[0]?.geometry.type).toBe('Point');
    // Note: Set iteration order for stopIds [1, 2] → [14 St, Times Sq] due to 0-based indexing
    expect(markers.features[0]?.properties?.name).toBe('14 St - Union Sq');
  });

  it('deduplicates stops across multiple legs', () => {
    const itinerary: Itinerary = {
      legs: [
        {
          type: 'vehicle',
          fromStopId: 1,
          toStopId: 2,
          fromStopName: '59 St - Columbus Circle',
          toStopName: '14 St - Union Sq',
          departureTime: new Date('2026-05-20T14:30:00Z'),
          arrivalTime: new Date('2026-05-20T15:00:00Z'),
          duration: 30,
        },
        {
          type: 'transfer',
          fromStopId: 2,
          toStopId: 3,
          fromStopName: '14 St - Union Sq',
          toStopName: 'Times Sq-42 St',
          departureTime: new Date('2026-05-20T15:00:00Z'),
          arrivalTime: new Date('2026-05-20T15:05:00Z'),
          duration: 5,
        },
      ],
      departureTime: new Date('2026-05-20T14:30:00Z'),
      arrivalTime: new Date('2026-05-20T15:05:00Z'),
      totalDuration: 35,
      transferCount: 1,
    };

    const markers = buildStationMarkers(itinerary, stopsIndex);

    expect(markers.features).toHaveLength(3); // Stops 1, 2, 3 (stop 2 appears only once)
  });
});

describe('calculateRouteBounds', () => {
  const stopsIndex = createMockStopsIndex();

  it('calculates bounds for single-leg itinerary', () => {
    const itinerary: Itinerary = {
      legs: [
        {
          type: 'vehicle',
          fromStopId: 1,
          toStopId: 2,
          fromStopName: '59 St - Columbus Circle',
          toStopName: '14 St - Union Sq',
          departureTime: new Date('2026-05-20T14:30:00Z'),
          arrivalTime: new Date('2026-05-20T15:00:00Z'),
          duration: 30,
        },
      ],
      departureTime: new Date('2026-05-20T14:30:00Z'),
      arrivalTime: new Date('2026-05-20T15:00:00Z'),
      totalDuration: 30,
      transferCount: 0,
    };

    const bounds = calculateRouteBounds(itinerary, stopsIndex);

    expect(bounds).not.toBeNull();
    expect(bounds).toHaveLength(2);
    // Note: stopId 1→14 St [-73.989951, 40.734673], stopId 2→Times Sq [-73.987495, 40.75529]
    expect(bounds![0]).toEqual([-73.989951, 40.734673]); // min lon, min lat
    expect(bounds![1]).toEqual([-73.987495, 40.75529]); // max lon, max lat
  });

  it('returns null for itinerary with no coordinates', () => {
    const itinerary: Itinerary = {
      legs: [
        {
          type: 'vehicle',
          fromStopId: 999,
          toStopId: 998,
          fromStopName: 'Unknown',
          toStopName: 'Unknown',
          departureTime: new Date('2026-05-20T14:30:00Z'),
          arrivalTime: new Date('2026-05-20T15:00:00Z'),
          duration: 30,
        },
      ],
      departureTime: new Date('2026-05-20T14:30:00Z'),
      arrivalTime: new Date('2026-05-20T15:00:00Z'),
      totalDuration: 30,
      transferCount: 0,
    };

    const bounds = calculateRouteBounds(itinerary, stopsIndex);

    expect(bounds).toBeNull();
  });
});
