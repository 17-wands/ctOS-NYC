import { describe, expect, it, vi } from 'vitest';
import { Router } from 'minotor';
import { buildQuery, buildRangeQuery, extractItineraries } from './adapter';
import type { TripQuery } from '../query/types';

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
