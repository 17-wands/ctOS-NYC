import { Query, RangeQuery, Router, type Leg, type Route, type StopId } from 'minotor';
import type { TripQuery } from '../query/types';
import type { ScheduleDay } from '../timetable';
import type { Itinerary, ItineraryLeg, LegType, ExclusionState } from './types';
import { dateToMinutesFromMidnight, minutesBetween, nycDateString, nycMidnight } from './time';

const RANGE_WINDOW_MINUTES = 120;

/**
 * A service day's coverage in minutes-from-its-midnight. Slightly past 24h so a
 * day-router still answers for its after-midnight (next-morning) service.
 */
const SERVICE_DAY_MINUTES = 1440 + 180;

function isVehicleLeg(
  leg: Leg,
): leg is Leg & { route: unknown; departureTime: number; arrivalTime: number } {
  return 'route' in leg && 'departureTime' in leg && 'arrivalTime' in leg;
}

function isTransferLeg(leg: Leg): leg is Leg & { type: unknown } {
  return 'type' in leg && !isVehicleLeg(leg);
}

export function buildQuery(tripQuery: TripQuery): Query {
  if (tripQuery.origin === null || tripQuery.destination === null) {
    throw new Error('Origin and destination are required');
  }

  const departureTime = dateToMinutesFromMidnight(tripQuery.dateTime);

  return new Query.Builder()
    .from(tripQuery.origin)
    .to(new Set([tripQuery.destination]))
    .departureTime(departureTime)
    .build();
}

export function buildRangeQuery(tripQuery: TripQuery): RangeQuery {
  if (tripQuery.origin === null || tripQuery.destination === null) {
    throw new Error('Origin and destination are required');
  }

  const departureTime = dateToMinutesFromMidnight(tripQuery.dateTime);
  const lastDepartureTime = departureTime + RANGE_WINDOW_MINUTES;

  return new RangeQuery.Builder()
    .from(tripQuery.origin)
    .to(new Set([tripQuery.destination]))
    .departureTime(departureTime)
    .lastDepartureTime(lastDepartureTime)
    .build();
}

/** An absolute instant `minutes` after a service day's NYC-local midnight. */
function instantFromMinutes(referenceMidnight: Date, minutes: number): Date {
  return new Date(referenceMidnight.getTime() + minutes * 60000);
}

function mapRoute(route: Route, referenceMidnight: Date): Itinerary {
  // minotor transfer/access legs carry no absolute time; anchor them at the
  // route's departure for display. Vehicle legs use their own minute offsets.
  const routeDepartureMinute = route.departureTime();

  const legs: ItineraryLeg[] = route.legs.map((leg) => {
    let type: LegType;
    let departureTime: Date;
    let arrivalTime: Date;
    let duration: number;
    let routeName: string | undefined;
    let routeShortName: string | undefined;

    if (isVehicleLeg(leg)) {
      type = 'vehicle';
      departureTime = instantFromMinutes(referenceMidnight, leg.departureTime);
      arrivalTime = instantFromMinutes(referenceMidnight, leg.arrivalTime);
      duration = leg.arrivalTime - leg.departureTime;
      // minotor's ServiceRouteInfo exposes `name` (the GTFS route_short_name),
      // not separate long/short names.
      const name = (leg.route as { name?: string }).name;
      routeName = name;
      routeShortName = name;
    } else if (isTransferLeg(leg)) {
      type = 'transfer';
      duration = 'minTransferTime' in leg ? ((leg.minTransferTime as number) ?? 2) : 2;
      departureTime = instantFromMinutes(referenceMidnight, routeDepartureMinute);
      arrivalTime = new Date(departureTime.getTime() + duration * 60000);
    } else {
      type = 'access';
      duration = 'duration' in leg ? (leg.duration as number) : 5;
      departureTime = instantFromMinutes(referenceMidnight, routeDepartureMinute);
      arrivalTime = new Date(departureTime.getTime() + duration * 60000);
    }

    return {
      type,
      fromStopId: leg.from.id,
      toStopId: leg.to.id,
      fromStopName: leg.from.name,
      toStopName: leg.to.name,
      departureTime,
      arrivalTime,
      duration,
      routeName,
      routeShortName,
    };
  });

  return {
    legs,
    departureTime: instantFromMinutes(referenceMidnight, route.departureTime()),
    arrivalTime: instantFromMinutes(referenceMidnight, route.arrivalTime()),
    totalDuration: route.totalDuration(),
    transferCount: legs.filter((leg) => leg.type === 'transfer').length,
  };
}

/**
 * Run a range query on one router and map the results to itineraries, with all
 * times anchored to `referenceMidnight` (the router's service-day midnight).
 */
function extractFromRouter(
  router: Router,
  origin: StopId,
  destination: StopId,
  departureMinutes: number,
  referenceMidnight: Date,
): Itinerary[] {
  const rangeQuery = new RangeQuery.Builder()
    .from(origin)
    .to(new Set([destination]))
    .departureTime(departureMinutes)
    .lastDepartureTime(departureMinutes + RANGE_WINDOW_MINUTES)
    .build();

  const result = router.rangeRoute(rangeQuery);
  if (!result) return [];

  const routes = result.getRoutes();
  if (!routes || routes.length === 0) return [];

  return routes.map((route: Route) => mapRoute(route, referenceMidnight));
}

/**
 * Extract itineraries from a single router, anchoring times to the NYC day of
 * the query. Kept for single-day callers and tests; `extractWindowedItineraries`
 * is the entry point the app uses across the loaded window.
 */
export function extractItineraries(router: Router, tripQuery: TripQuery): Itinerary[] {
  if (tripQuery.origin === null || tripQuery.destination === null) {
    throw new Error('Origin and destination are required');
  }
  const referenceMidnight = nycMidnight(nycDateString(tripQuery.dateTime));
  const departureMinutes = dateToMinutesFromMidnight(tripQuery.dateTime);
  return extractFromRouter(
    router,
    tripQuery.origin,
    tripQuery.destination,
    departureMinutes,
    referenceMidnight,
  );
}

/**
 * Extract itineraries across the loaded service days. Each day-router is queried
 * with the departure time expressed relative to that day's NYC midnight, so a
 * late-night query is answered by the day whose service actually covers it (and
 * a future-dated query by the matching day). Results are merged, de-duplicated,
 * and sorted by departure.
 */
export function extractWindowedItineraries(days: ScheduleDay[], tripQuery: TripQuery): Itinerary[] {
  if (tripQuery.origin === null || tripQuery.destination === null) {
    throw new Error('Origin and destination are required');
  }

  const merged: Itinerary[] = [];
  for (const day of days) {
    const midnight = nycMidnight(day.serviceDate);
    const offset = minutesBetween(midnight, tripQuery.dateTime);
    // Skip days whose service window cannot contain the query departure.
    if (offset < -RANGE_WINDOW_MINUTES || offset > SERVICE_DAY_MINUTES) continue;

    const departureMinutes = Math.max(0, offset);
    merged.push(
      ...extractFromRouter(
        day.router,
        tripQuery.origin,
        tripQuery.destination,
        departureMinutes,
        midnight,
      ),
    );
  }

  return dedupeAndSort(merged);
}

/** Remove duplicate itineraries (same times + vehicle-leg signature) and sort by departure. */
function dedupeAndSort(itineraries: Itinerary[]): Itinerary[] {
  const seen = new Set<string>();
  const unique = itineraries.filter((itinerary) => {
    const signature = itinerary.legs
      .filter((leg) => leg.type === 'vehicle')
      .map((leg) => `${leg.routeShortName ?? ''}:${leg.fromStopId}>${leg.toStopId}`)
      .join(',');
    const key = `${itinerary.departureTime.toISOString()}|${itinerary.arrivalTime.toISOString()}|${signature}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort(
    (a, b) =>
      a.departureTime.getTime() - b.departureTime.getTime() ||
      a.arrivalTime.getTime() - b.arrivalTime.getTime(),
  );
  return unique;
}

export function filterItineraries(
  itineraries: Itinerary[],
  exclusions: ExclusionState,
): Itinerary[] {
  if (exclusions.excludedRoutes.size === 0 && exclusions.excludedStops.size === 0) {
    return itineraries;
  }

  return itineraries.filter((itinerary) => {
    for (const leg of itinerary.legs) {
      if (leg.type !== 'vehicle') continue;

      if (leg.routeShortName && exclusions.excludedRoutes.has(leg.routeShortName)) {
        return false;
      }
      if (leg.routeName && exclusions.excludedRoutes.has(leg.routeName)) {
        return false;
      }

      if (
        exclusions.excludedStops.has(leg.fromStopId) ||
        exclusions.excludedStops.has(leg.toStopId)
      ) {
        return false;
      }
    }

    return true;
  });
}
