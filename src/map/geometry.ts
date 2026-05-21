import type { Itinerary } from '../routing/types';
import type { StopsIndex } from 'minotor';

export function buildRouteTrace(
  itinerary: Itinerary,
  stopsIndex: StopsIndex,
): GeoJSON.Feature<GeoJSON.LineString> {
  const coordinates: [number, number][] = [];

  for (const leg of itinerary.legs) {
    const fromStop = stopsIndex.findStopById(leg.fromStopId);
    const toStop = stopsIndex.findStopById(leg.toStopId);

    if (fromStop?.lon !== undefined && fromStop?.lat !== undefined) {
      coordinates.push([fromStop.lon, fromStop.lat]);
    }
    if (toStop?.lon !== undefined && toStop?.lat !== undefined) {
      coordinates.push([toStop.lon, toStop.lat]);
    }
  }

  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates },
    properties: {},
  };
}

export function buildStationMarkers(
  itinerary: Itinerary,
  stopsIndex: StopsIndex,
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const uniqueStops = new Set<number>();

  for (const leg of itinerary.legs) {
    uniqueStops.add(leg.fromStopId);
    uniqueStops.add(leg.toStopId);
  }

  const features: GeoJSON.Feature<GeoJSON.Point>[] = [];

  for (const stopId of uniqueStops) {
    const stop = stopsIndex.findStopById(stopId);
    if (stop?.lon !== undefined && stop?.lat !== undefined) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [stop.lon, stop.lat] },
        properties: { name: stop.name, id: stop.id },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

export function calculateRouteBounds(
  itinerary: Itinerary,
  stopsIndex: StopsIndex,
): [[number, number], [number, number]] | null {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const leg of itinerary.legs) {
    const fromStop = stopsIndex.findStopById(leg.fromStopId);
    const toStop = stopsIndex.findStopById(leg.toStopId);

    if (fromStop?.lon && fromStop?.lat) {
      minLon = Math.min(minLon, fromStop.lon);
      maxLon = Math.max(maxLon, fromStop.lon);
      minLat = Math.min(minLat, fromStop.lat);
      maxLat = Math.max(maxLat, fromStop.lat);
    }

    if (toStop?.lon && toStop?.lat) {
      minLon = Math.min(minLon, toStop.lon);
      maxLon = Math.max(maxLon, toStop.lon);
      minLat = Math.min(minLat, toStop.lat);
      maxLat = Math.max(maxLat, toStop.lat);
    }
  }

  if (minLon === Infinity) return null;

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}
