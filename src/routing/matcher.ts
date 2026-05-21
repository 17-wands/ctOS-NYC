import type { Itinerary, ItineraryLeg } from './types';
import type { Alert, TripDelay, AccessibilityOutage } from '../realtime/types';
import type { AnnotatedItinerary, LegDisruption } from './disruptions';

/**
 * Matches a leg to relevant alerts.
 * Returns alerts where:
 * - alert.routeIds includes leg.routeShortName OR leg.routeName
 * - OR alert.stopIds includes leg.fromStopId OR leg.toStopId
 */
function matchAlertsToLeg(leg: ItineraryLeg, alerts: Alert[]): Alert[] {
  return alerts.filter((alert) => {
    // Match by route
    const routeMatch =
      (leg.routeShortName && alert.routeIds.includes(leg.routeShortName)) ||
      (leg.routeName && alert.routeIds.includes(leg.routeName));

    // Match by stop
    const stopMatch =
      alert.stopIds.includes(String(leg.fromStopId)) ||
      alert.stopIds.includes(String(leg.toStopId));

    return routeMatch || stopMatch;
  });
}

/**
 * Finds trip delay for a specific leg.
 * Returns delay where routeId matches and stopId matches fromStopId or toStopId.
 */
function matchDelayToLeg(leg: ItineraryLeg, delays: TripDelay[]): TripDelay | undefined {
  return delays.find(
    (delay) =>
      (leg.routeShortName === delay.routeId || leg.routeName === delay.routeId) &&
      (String(leg.fromStopId) === delay.stopId || String(leg.toStopId) === delay.stopId),
  );
}

/**
 * Finds accessibility outages at leg stops.
 */
function matchAccessibilityToLeg(
  leg: ItineraryLeg,
  outages: AccessibilityOutage[],
): AccessibilityOutage | undefined {
  return outages.find(
    (outage) =>
      outage.stationId === String(leg.fromStopId) || outage.stationId === String(leg.toStopId),
  );
}

/**
 * Determines worst severity from matched alerts.
 */
function getWorstSeverity(alerts: Alert[]): 'warning' | 'critical' | undefined {
  const hasBreach = alerts.some((a) => a.severity === 'BREACH');
  const hasDegraded = alerts.some((a) => a.severity === 'DEGRADED');

  if (hasBreach) return 'critical';
  if (hasDegraded) return 'warning';
  return undefined;
}

/**
 * Annotates an itinerary with disruption information.
 */
export function annotateItinerary(
  itinerary: Itinerary,
  realtimeData: {
    alerts: Alert[];
    tripDelays: TripDelay[];
    accessibilityOutages: AccessibilityOutage[];
  },
): AnnotatedItinerary {
  let worstSeverity: 'warning' | 'critical' | undefined = undefined;

  const annotatedLegs = itinerary.legs.map((leg) => {
    // Only annotate vehicle legs (transit legs)
    if (leg.type !== 'vehicle') {
      return { ...leg };
    }

    const matchedAlerts = matchAlertsToLeg(leg, realtimeData.alerts);
    const delay = matchDelayToLeg(leg, realtimeData.tripDelays);
    const accessibilityIssue = matchAccessibilityToLeg(leg, realtimeData.accessibilityOutages);

    if (matchedAlerts.length === 0 && !delay && !accessibilityIssue) {
      return { ...leg };
    }

    const severity = getWorstSeverity(matchedAlerts);

    // Update worst severity for entire itinerary
    if (severity === 'critical') {
      worstSeverity = 'critical';
    } else if (severity === 'warning' && worstSeverity !== 'critical') {
      worstSeverity = 'warning';
    }

    const disruption: LegDisruption = {
      severity: severity || 'warning',
      alerts: matchedAlerts,
      delays: delay,
      accessibilityIssue,
    };

    return { ...leg, disruption };
  });

  return {
    ...itinerary,
    legs: annotatedLegs,
    worstSeverity,
  };
}
