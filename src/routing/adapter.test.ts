import { describe, expect, it, vi } from 'vitest';
import { Router } from 'minotor';
import {
  buildQuery,
  buildRangeQuery,
  extractItineraries,
  extractWindowedItineraries,
  filterItineraries,
} from './adapter';
import type { TripQuery } from '../query/types';
import type { ScheduleDay } from '../timetable';
import type { Itinerary, ExclusionState } from './types';

describe('buildQuery', () => {
  it('builds a simple query with origin, destination, and departure time', () => {
    const tripQuery: TripQuery = {
      origin: 1,
      destination: 2,
      mode: 'depart-at',
      dateTime: new Date('2026-05-20T14:30:00-04:00'),
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
      dateTime: new Date('2026-05-20T14:30:00-04:00'),
    };

    expect(() => buildQuery(tripQuery)).toThrow('Origin and destination are required');
  });

  it('throws when destination is missing', () => {
    const tripQuery: TripQuery = {
      origin: 1,
      destination: null,
      mode: 'depart-at',
      dateTime: new Date('2026-05-20T14:30:00-04:00'),
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
      dateTime: new Date('2026-05-20T14:30:00-04:00'),
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
      dateTime: new Date('2026-05-20T14:30:00-04:00'),
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
      dateTime: new Date('2026-05-20T14:30:00-04:00'),
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
          route: { name: 'Q', type: 'SUBWAY' },
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
      dateTime: new Date('2026-05-20T00:00:00-04:00'),
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
      routeName: 'Q',
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
        departureTime: new Date('2026-05-20T14:30:00-04:00'),
        arrivalTime: new Date('2026-05-20T15:00:00-04:00'),
        duration: 30,
        routeName: 'Broadway Express',
        routeShortName: 'Q',
      },
    ],
    departureTime: new Date('2026-05-20T14:30:00-04:00'),
    arrivalTime: new Date('2026-05-20T15:00:00-04:00'),
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
          departureTime: new Date('2026-05-20T14:30:00-04:00'),
          arrivalTime: new Date('2026-05-20T14:35:00-04:00'),
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
          departureTime: new Date('2026-05-20T14:30:00-04:00'),
          arrivalTime: new Date('2026-05-20T14:45:00-04:00'),
          duration: 15,
          routeShortName: 'N',
        },
        {
          type: 'transfer',
          fromStopId: 2,
          toStopId: 3,
          fromStopName: 'Times Sq',
          toStopName: 'Times Sq',
          departureTime: new Date('2026-05-20T14:45:00-04:00'),
          arrivalTime: new Date('2026-05-20T14:50:00-04:00'),
          duration: 5,
        },
        {
          type: 'vehicle',
          fromStopId: 3,
          toStopId: 4,
          fromStopName: 'Times Sq',
          toStopName: '14 St',
          departureTime: new Date('2026-05-20T14:50:00-04:00'),
          arrivalTime: new Date('2026-05-20T15:05:00-04:00'),
          duration: 15,
          routeShortName: 'L',
        },
      ],
      departureTime: new Date('2026-05-20T14:30:00-04:00'),
      arrivalTime: new Date('2026-05-20T15:05:00-04:00'),
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

describe('extractWindowedItineraries', () => {
  type MockRangeRoute = ReturnType<typeof vi.fn>;

  function makeRoute(depMin: number, arrMin: number, shortName: string) {
    return {
      legs: [
        {
          from: { id: 1, name: 'A' },
          to: { id: 2, name: 'B' },
          route: { name: shortName, type: 'SUBWAY' },
          departureTime: depMin,
          arrivalTime: arrMin,
        },
      ],
      departureTime: () => depMin,
      arrivalTime: () => arrMin,
      totalDuration: () => arrMin - depMin,
    };
  }

  function makeDay(serviceDate: string, routes: ReturnType<typeof makeRoute>[]) {
    const rangeRoute: MockRangeRoute = vi.fn(() =>
      routes.length > 0 ? { getRoutes: () => routes } : null,
    );
    const day: ScheduleDay = {
      serviceDate,
      router: { rangeRoute } as unknown as ScheduleDay['router'],
    };
    return { day, rangeRoute };
  }

  const query = (dateTime: string): TripQuery => ({
    origin: 1,
    destination: 2,
    mode: 'depart-at',
    dateTime: new Date(dateTime),
  });

  it('queries only the day whose service covers a future-dated departure', () => {
    const yesterday = makeDay('2026-05-20', [makeRoute(540, 570, 'Q')]);
    const target = makeDay('2026-05-21', [makeRoute(540, 570, 'Q')]);

    const result = extractWindowedItineraries(
      [yesterday.day, target.day],
      query('2026-05-21T09:00:00-04:00'),
    );

    expect(yesterday.rangeRoute).not.toHaveBeenCalled();
    expect(target.rangeRoute).toHaveBeenCalled();
    expect(target.rangeRoute.mock.calls[0]?.[0].departureTime).toBe(540);
    expect(result).toHaveLength(1);
  });

  it('queries both the late-night day and the next day for an after-midnight departure', () => {
    const late = makeDay('2026-05-20', [makeRoute(1430, 1460, 'Q')]);
    const next = makeDay('2026-05-21', [makeRoute(0, 20, 'R')]);

    extractWindowedItineraries([late.day, next.day], query('2026-05-20T23:50:00-04:00'));

    expect(late.rangeRoute).toHaveBeenCalled();
    expect(late.rangeRoute.mock.calls[0]?.[0].departureTime).toBe(1430);
    expect(next.rangeRoute).toHaveBeenCalled();
    expect(next.rangeRoute.mock.calls[0]?.[0].departureTime).toBe(0);
  });

  it('merges results across in-window days, sorted by absolute departure', () => {
    const late = makeDay('2026-05-20', [makeRoute(1430, 1460, 'Q')]); // 05-21T03:50Z
    const next = makeDay('2026-05-21', [makeRoute(0, 20, 'R')]); // 05-21T04:00Z

    const result = extractWindowedItineraries(
      [late.day, next.day],
      query('2026-05-20T23:50:00-04:00'),
    );

    expect(result).toHaveLength(2);
    expect(result[0]?.legs[0]?.routeShortName).toBe('Q'); // earlier absolute departure
    expect(result[1]?.legs[0]?.routeShortName).toBe('R');
    expect(result[0]!.departureTime.getTime()).toBeLessThan(result[1]!.departureTime.getTime());
  });

  it('de-duplicates identical itineraries', () => {
    const day = makeDay('2026-05-20', [makeRoute(720, 750, 'Q'), makeRoute(720, 750, 'Q')]);

    const result = extractWindowedItineraries([day.day], query('2026-05-20T12:00:00-04:00'));

    expect(result).toHaveLength(1);
  });

  it('throws when origin or destination is missing', () => {
    const day = makeDay('2026-05-20', []);
    const bad: TripQuery = {
      origin: null,
      destination: 2,
      mode: 'depart-at',
      dateTime: new Date('2026-05-20T12:00:00-04:00'),
    };
    expect(() => extractWindowedItineraries([day.day], bad)).toThrow(
      'Origin and destination are required',
    );
  });
});
