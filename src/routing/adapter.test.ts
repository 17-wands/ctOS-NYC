import { describe, expect, it, vi } from 'vitest';
import { Router } from 'minotor';
import { buildQuery, buildRangeQuery, extractItineraries, filterItineraries } from './adapter';
import type { TripQuery } from '../query/types';
import type { Itinerary, ExclusionState } from './types';

describe('buildQuery', () => {
  it('builds a simple query with origin, destination, and departure time', () => {
    const tripQuery: TripQuery = {
      origin: 1,
      destination: 2,
      mode: 'depart-at',
      dateTime: new Date('2026-05-20T14:30:00Z'),
    };

    const query = buildQuery(tripQuery);

    expect(query.from).toBe(1);
    expect(query.to).toEqual(new Set([2]));
    expect(query.departureTime).toBe(870); // 14:30 = 870 minutes from midnight
  });

  it('throws when origin is missing', () => {
    const tripQuery: TripQuery = {
      origin: null,
      destination: 2,
      mode: 'depart-at',
      dateTime: new Date('2026-05-20T14:30:00Z'),
    };

    expect(() => buildQuery(tripQuery)).toThrow('Origin and destination are required');
  });

  it('throws when destination is missing', () => {
    const tripQuery: TripQuery = {
      origin: 1,
      destination: null,
      mode: 'depart-at',
      dateTime: new Date('2026-05-20T14:30:00Z'),
    };

    expect(() => buildQuery(tripQuery)).toThrow('Origin and destination are required');
  });
});

describe('buildRangeQuery', () => {
  it('builds a range query with 2-hour window', () => {
    const tripQuery: TripQuery = {
      origin: 1,
      destination: 2,
      mode: 'depart-at',
      dateTime: new Date('2026-05-20T14:30:00Z'),
    };

    const query = buildRangeQuery(tripQuery);

    expect(query.from).toBe(1);
    expect(query.to).toEqual(new Set([2]));
    expect(query.departureTime).toBe(870);
    expect(query.lastDepartureTime).toBe(990); // 870 + 120
  });
});

describe('extractItineraries', () => {
  it('returns empty array when router returns no result', () => {
    const mockRouter = {
      rangeRoute: vi.fn().mockReturnValue(null),
    } as unknown as Router;

    const tripQuery: TripQuery = {
      origin: 1,
      destination: 2,
      mode: 'depart-at',
      dateTime: new Date('2026-05-20T14:30:00Z'),
    };

    const itineraries = extractItineraries(mockRouter, tripQuery);

    expect(itineraries).toEqual([]);
  });

  it('returns empty array when no routes found to destination', () => {
    const mockRouter = {
      rangeRoute: vi.fn().mockReturnValue({
        getRoutes: vi.fn().mockReturnValue([]),
      }),
    } as unknown as Router;

    const tripQuery: TripQuery = {
      origin: 1,
      destination: 2,
      mode: 'depart-at',
      dateTime: new Date('2026-05-20T14:30:00Z'),
    };

    const itineraries = extractItineraries(mockRouter, tripQuery);

    expect(itineraries).toEqual([]);
  });

  it('converts minotor routes to itineraries', () => {
    const mockRoute = {
      legs: [
        {
          from: { id: 1, name: '59 St - Columbus Circle' },
          to: { id: 2, name: '14 St - Union Sq' },
          route: { longName: 'Broadway Express', shortName: 'Q' },
          departureTime: 870,
          arrivalTime: 900,
        },
      ],
      departureTime: () => 870,
      arrivalTime: () => 900,
      totalDuration: () => 30,
    };

    const mockRouter = {
      rangeRoute: vi.fn().mockReturnValue({
        getRoutes: vi.fn().mockReturnValue([mockRoute]),
      }),
    } as unknown as Router;

    const tripQuery: TripQuery = {
      origin: 1,
      destination: 2,
      mode: 'depart-at',
      dateTime: new Date('2026-05-20T00:00:00Z'),
    };

    const itineraries = extractItineraries(mockRouter, tripQuery);

    expect(itineraries).toHaveLength(1);
    expect(itineraries[0]?.legs).toHaveLength(1);
    expect(itineraries[0]?.legs[0]).toMatchObject({
      type: 'vehicle',
      fromStopId: 1,
      toStopId: 2,
      fromStopName: '59 St - Columbus Circle',
      toStopName: '14 St - Union Sq',
      duration: 30,
      routeName: 'Broadway Express',
      routeShortName: 'Q',
    });
    expect(itineraries[0]?.totalDuration).toBe(30);
    expect(itineraries[0]?.transferCount).toBe(0);
  });
});

describe('filterItineraries', () => {
  const mockItinerary: Itinerary = {
    legs: [
      {
        type: 'vehicle',
        fromStopId: 1,
        toStopId: 2,
        fromStopName: '59 St',
        toStopName: '14 St',
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

  it('returns all itineraries when exclusions are empty', () => {
    const itineraries = [mockItinerary];
    const exclusions: ExclusionState = { excludedRoutes: new Set(), excludedStops: new Set() };

    const result = filterItineraries(itineraries, exclusions);

    expect(result).toEqual(itineraries);
  });

  it('excludes itineraries using excluded route (by routeShortName)', () => {
    const itineraries = [mockItinerary];
    const exclusions: ExclusionState = {
      excludedRoutes: new Set(['Q']),
      excludedStops: new Set(),
    };

    const result = filterItineraries(itineraries, exclusions);

    expect(result).toEqual([]);
  });

  it('excludes itineraries using excluded route (by routeName)', () => {
    const itineraries = [mockItinerary];
    const exclusions: ExclusionState = {
      excludedRoutes: new Set(['Broadway Express']),
      excludedStops: new Set(),
    };

    const result = filterItineraries(itineraries, exclusions);

    expect(result).toEqual([]);
  });

  it('excludes itineraries using excluded stop (fromStopId)', () => {
    const itineraries = [mockItinerary];
    const exclusions: ExclusionState = {
      excludedRoutes: new Set(),
      excludedStops: new Set([1]),
    };

    const result = filterItineraries(itineraries, exclusions);

    expect(result).toEqual([]);
  });

  it('excludes itineraries using excluded stop (toStopId)', () => {
    const itineraries = [mockItinerary];
    const exclusions: ExclusionState = {
      excludedRoutes: new Set(),
      excludedStops: new Set([2]),
    };

    const result = filterItineraries(itineraries, exclusions);

    expect(result).toEqual([]);
  });

  it('does not exclude transfer or access legs', () => {
    const itineraryWithTransfer: Itinerary = {
      ...mockItinerary,
      legs: [
        {
          type: 'transfer',
          fromStopId: 1,
          toStopId: 2,
          fromStopName: '59 St',
          toStopName: '14 St',
          departureTime: new Date('2026-05-20T14:30:00Z'),
          arrivalTime: new Date('2026-05-20T14:35:00Z'),
          duration: 5,
        },
      ],
    };

    const exclusions: ExclusionState = {
      excludedRoutes: new Set(),
      excludedStops: new Set([1]),
    };

    const result = filterItineraries([itineraryWithTransfer], exclusions);

    expect(result).toEqual([itineraryWithTransfer]);
  });

  it('returns empty array when all itineraries are excluded', () => {
    const itineraries = [mockItinerary];
    const exclusions: ExclusionState = {
      excludedRoutes: new Set(['Q']),
      excludedStops: new Set(),
    };

    const result = filterItineraries(itineraries, exclusions);

    expect(result).toEqual([]);
  });

  it('excludes itinerary if ANY leg uses excluded route', () => {
    const multiLegItinerary: Itinerary = {
      legs: [
        {
          type: 'vehicle',
          fromStopId: 1,
          toStopId: 2,
          fromStopName: '59 St',
          toStopName: 'Times Sq',
          departureTime: new Date('2026-05-20T14:30:00Z'),
          arrivalTime: new Date('2026-05-20T14:45:00Z'),
          duration: 15,
          routeShortName: 'N',
        },
        {
          type: 'transfer',
          fromStopId: 2,
          toStopId: 3,
          fromStopName: 'Times Sq',
          toStopName: 'Times Sq',
          departureTime: new Date('2026-05-20T14:45:00Z'),
          arrivalTime: new Date('2026-05-20T14:50:00Z'),
          duration: 5,
        },
        {
          type: 'vehicle',
          fromStopId: 3,
          toStopId: 4,
          fromStopName: 'Times Sq',
          toStopName: '14 St',
          departureTime: new Date('2026-05-20T14:50:00Z'),
          arrivalTime: new Date('2026-05-20T15:05:00Z'),
          duration: 15,
          routeShortName: 'L',
        },
      ],
      departureTime: new Date('2026-05-20T14:30:00Z'),
      arrivalTime: new Date('2026-05-20T15:05:00Z'),
      totalDuration: 35,
      transferCount: 1,
    };

    const exclusions: ExclusionState = {
      excludedRoutes: new Set(['L']),
      excludedStops: new Set(),
    };

    const result = filterItineraries([multiLegItinerary], exclusions);

    expect(result).toEqual([]);
  });

  it('keeps itinerary if no legs match exclusions', () => {
    const itineraries = [mockItinerary];
    const exclusions: ExclusionState = {
      excludedRoutes: new Set(['L']),
      excludedStops: new Set([999]),
    };

    const result = filterItineraries(itineraries, exclusions);

    expect(result).toEqual(itineraries);
  });
});
