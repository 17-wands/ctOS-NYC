import { Query, RangeQuery, Router, type Leg, type Route } from 'minotor';
import type { TripQuery } from '../query/types';
import type { Itinerary, ItineraryLeg, LegType } from './types';
import { dateToMinutesFromMidnight, minutesFromMidnightToDate } from './time';

const RANGE_WINDOW_MINUTES = 120;

function isVehicleLeg(
  leg: Leg,
): leg is Leg & { route: unknown; departureTime: number; arrivalTime: number } {
  return 'route' in leg && 'departureTime' in leg && 'arrivalTime' in leg;
}

function isTransferLeg(leg: Leg): leg is Leg & { type: unknown } {
  return 'type' in leg && !isVehicleLeg(leg);
}

export function buildQuery(tripQuery: TripQuery): Query {
  if (!tripQuery.origin || !tripQuery.destination) {
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
  if (!tripQuery.origin || !tripQuery.destination) {
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

export function extractItineraries(router: Router, tripQuery: TripQuery): Itinerary[] {
  const rangeQuery = buildRangeQuery(tripQuery);
  const result = router.rangeRoute(rangeQuery);

  if (!result) {
    return [];
  }

  const routes = result.getRoutes();
  if (!routes || routes.length === 0) {
    return [];
  }

  return routes.map((route: Route) => {
    const legs: ItineraryLeg[] = route.legs.map((leg) => {
      let type: LegType;
      let departureTime: Date;
      let arrivalTime: Date;
      let duration: number;
      let routeName: string | undefined;
      let routeShortName: string | undefined;

      if (isVehicleLeg(leg)) {
        type = 'vehicle';
        departureTime = minutesFromMidnightToDate(leg.departureTime, tripQuery.dateTime);
        arrivalTime = minutesFromMidnightToDate(leg.arrivalTime, tripQuery.dateTime);
        duration = leg.arrivalTime - leg.departureTime;
        routeName = (leg.route as { longName?: string }).longName;
        routeShortName = (leg.route as { shortName?: string }).shortName;
      } else if (isTransferLeg(leg)) {
        type = 'transfer';
        const transferDuration =
          'minTransferTime' in leg ? ((leg.minTransferTime as number) ?? 2) : 2;
        duration = transferDuration;
        departureTime = new Date(tripQuery.dateTime);
        arrivalTime = new Date(departureTime.getTime() + duration * 60000);
      } else {
        type = 'access';
        const accessDuration = 'duration' in leg ? (leg.duration as number) : 5;
        duration = accessDuration;
        departureTime = new Date(tripQuery.dateTime);
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

    const departureTime = minutesFromMidnightToDate(route.departureTime(), tripQuery.dateTime);
    const arrivalTime = minutesFromMidnightToDate(route.arrivalTime(), tripQuery.dateTime);
    const totalDuration = route.totalDuration();
    const transferCount = legs.filter((leg) => leg.type === 'transfer').length;

    return {
      legs,
      departureTime,
      arrivalTime,
      totalDuration,
      transferCount,
    };
  });
}
