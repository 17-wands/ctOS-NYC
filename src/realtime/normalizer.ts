import { transit_realtime } from 'gtfs-realtime-bindings';
import type { Alert, TripDelay, AccessibilityOutage, Severity } from './types';

/**
 * Maps GTFS-realtime Alert.Effect to our severity levels.
 * Per ARCHITECTURE.md §4:
 * - SYSTEM → info (system-wide, planned)
 * - DEGRADED → warning (delays, service changes)
 * - BREACH → critical (suspended service, major disruptions)
 */
function mapSeverity(effect: transit_realtime.Alert.Effect | null | undefined): Severity {
  if (effect === null || effect === undefined) {
    return 'SYSTEM';
  }

  switch (effect) {
    case transit_realtime.Alert.Effect.NO_SERVICE:
    case transit_realtime.Alert.Effect.REDUCED_SERVICE:
    case transit_realtime.Alert.Effect.DETOUR:
      return 'BREACH';
    case transit_realtime.Alert.Effect.SIGNIFICANT_DELAYS:
    case transit_realtime.Alert.Effect.MODIFIED_SERVICE:
    case transit_realtime.Alert.Effect.OTHER_EFFECT:
      return 'DEGRADED';
    case transit_realtime.Alert.Effect.ADDITIONAL_SERVICE:
    case transit_realtime.Alert.Effect.STOP_MOVED:
    case transit_realtime.Alert.Effect.UNKNOWN_EFFECT:
    default:
      return 'SYSTEM';
  }
}

/**
 * Formats Unix timestamp to ISO-8601 string.
 */
function formatTimestamp(timestamp: number | Long | null | undefined): string | null {
  if (timestamp === null || timestamp === undefined) {
    return null;
  }

  // GTFS-realtime uses 0 (or an absent field) for open-ended periods; treat any
  // non-positive value as "no timestamp" rather than 1970-01-01.
  const seconds = typeof timestamp === 'number' ? timestamp : Number(timestamp);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return new Date(seconds * 1000).toISOString();
}

/**
 * Extracts route IDs from informed_entity array.
 */
function extractRouteIds(
  informedEntities: transit_realtime.IEntitySelector[] | null | undefined,
): string[] {
  if (!informedEntities) return [];

  const routeIds = new Set<string>();
  for (const entity of informedEntities) {
    if (entity.routeId) {
      routeIds.add(entity.routeId);
    }
  }
  return Array.from(routeIds);
}

/**
 * Extracts stop IDs from informed_entity array.
 */
function extractStopIds(
  informedEntities: transit_realtime.IEntitySelector[] | null | undefined,
): string[] {
  if (!informedEntities) return [];

  const stopIds = new Set<string>();
  for (const entity of informedEntities) {
    if (entity.stopId) {
      stopIds.add(entity.stopId);
    }
  }
  return Array.from(stopIds);
}

/**
 * Normalizes GTFS-realtime service alerts to our Alert type.
 */
export function normalizeAlerts(alertFeed: transit_realtime.FeedMessage): Alert[] {
  const alerts: Alert[] = [];

  if (!alertFeed.entity) return alerts;

  for (const entity of alertFeed.entity) {
    if (!entity.alert) continue;

    const alert = entity.alert;
    const activePeriod =
      alert.activePeriod && alert.activePeriod.length > 0 ? alert.activePeriod[0] : null;

    alerts.push({
      id: entity.id || `alert-${Date.now()}`,
      severity: mapSeverity(alert.effect),
      header: alert.headerText?.translation?.[0]?.text || 'Service Alert',
      description: alert.descriptionText?.translation?.[0]?.text || '',
      routeIds: extractRouteIds(alert.informedEntity),
      stopIds: extractStopIds(alert.informedEntity),
      activePeriod: {
        start: formatTimestamp(activePeriod?.start) || new Date().toISOString(),
        end: formatTimestamp(activePeriod?.end),
      },
    });
  }

  return alerts;
}

/**
 * Normalizes GTFS-realtime trip updates to TripDelay array.
 */
export function normalizeTripDelays(tripUpdateFeeds: transit_realtime.FeedMessage[]): TripDelay[] {
  const delays: TripDelay[] = [];

  for (const feed of tripUpdateFeeds) {
    if (!feed.entity) continue;

    for (const entity of feed.entity) {
      if (!entity.tripUpdate) continue;

      const tripUpdate = entity.tripUpdate;
      const routeId = tripUpdate.trip?.routeId;

      if (!routeId || !tripUpdate.stopTimeUpdate) continue;

      for (const stopTimeUpdate of tripUpdate.stopTimeUpdate) {
        const stopId = stopTimeUpdate.stopId;
        const delay = stopTimeUpdate.departure?.delay || stopTimeUpdate.arrival?.delay;

        if (stopId && delay) {
          delays.push({
            routeId,
            stopId,
            delaySeconds: typeof delay === 'number' ? delay : Number(delay),
          });
        }
      }
    }
  }

  return delays;
}

/**
 * Normalizes GTFS-realtime accessibility feed to AccessibilityOutage array.
 * Note: This is a placeholder implementation as the actual MTA accessibility feed
 * structure may differ from standard GTFS-realtime. May need adjustment based on
 * actual feed format.
 */
export function normalizeAccessibilityOutages(
  accessibilityFeed: transit_realtime.FeedMessage,
): AccessibilityOutage[] {
  const outages: AccessibilityOutage[] = [];

  if (!accessibilityFeed.entity) return outages;

  for (const entity of accessibilityFeed.entity) {
    // The MTA accessibility feed uses alerts for elevator/escalator outages
    if (!entity.alert) continue;

    const alert = entity.alert;
    const header = alert.headerText?.translation?.[0]?.text || '';
    const description = alert.descriptionText?.translation?.[0]?.text || '';

    // Determine equipment type from header/description
    const isElevator = /elevator/i.test(header) || /elevator/i.test(description);
    const isEscalator = /escalator/i.test(header) || /escalator/i.test(description);

    if (!isElevator && !isEscalator) continue;

    // Extract station ID from informed_entity
    const stationId = alert.informedEntity?.[0]?.stopId || entity.id || 'unknown';

    const activePeriod =
      alert.activePeriod && alert.activePeriod.length > 0 ? alert.activePeriod[0] : null;

    outages.push({
      stationId,
      equipmentType: isElevator ? 'ELEVATOR' : 'ESCALATOR',
      status: 'OUT',
      reason: description || header,
      estimatedReturn: formatTimestamp(activePeriod?.end),
    });
  }

  return outages;
}
