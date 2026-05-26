import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { StopsIndex } from 'minotor';
import type { Itinerary } from '../routing/types';
import { buildRouteTrace, buildStationMarkers, calculateRouteBounds } from './geometry';
import styles from './Map.module.css';

type MapProps = {
  itinerary: Itinerary;
  stopsIndex: StopsIndex;
};

/**
 * Strip the basemap down to context only, so the route reads as the figure.
 * The OpenFreeMap "liberty" style ships full streets + POIs + labels; mute every
 * line, flatten fills toward the background, drop POI/transit icons, and keep
 * place labels in a muted ash. (DESIGN.md §9: route foregrounded.)
 */
function muteBasemap(map: maplibregl.Map): void {
  const safe = (fn: () => void) => {
    try {
      fn();
    } catch {
      // Property not applicable to this layer; ignore.
    }
  };

  safe(() => map.setPaintProperty('background', 'background-color', '#101317'));

  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id;
    switch (layer.type) {
      case 'symbol':
        if (/poi|transit|aerialway|housenumber/i.test(id)) {
          safe(() => map.setLayoutProperty(id, 'visibility', 'none'));
        } else {
          safe(() => map.setPaintProperty(id, 'text-color', '#8b95a0'));
          safe(() => map.setPaintProperty(id, 'text-halo-color', '#050608'));
          safe(() => map.setPaintProperty(id, 'icon-opacity', 0));
        }
        break;
      case 'line':
        safe(() => map.setPaintProperty(id, 'line-color', '#2a3139'));
        safe(() => map.setPaintProperty(id, 'line-opacity', 0.5));
        break;
      case 'fill':
        safe(() => map.setPaintProperty(id, 'fill-color', '#0c0f13'));
        break;
      case 'fill-extrusion':
        safe(() => map.setLayoutProperty(id, 'visibility', 'none'));
        break;
    }
  }

  for (const water of ['water', 'waterway']) {
    safe(() => map.setPaintProperty(water, 'fill-color', '#050608'));
  }
}

/** Add or update the route trace, station markers, and viewport for an itinerary. */
function drawItinerary(map: maplibregl.Map, itinerary: Itinerary, stopsIndex: StopsIndex): void {
  const routeTrace = buildRouteTrace(itinerary, stopsIndex);
  const stationMarkers = buildStationMarkers(itinerary, stopsIndex);
  const bounds = calculateRouteBounds(itinerary, stopsIndex);

  const routeSource = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
  if (routeSource) {
    routeSource.setData(routeTrace);
  } else {
    map.addSource('route', { type: 'geojson', data: routeTrace });
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 4 },
    });
  }

  const stationsSource = map.getSource('stations') as maplibregl.GeoJSONSource | undefined;
  if (stationsSource) {
    stationsSource.setData(stationMarkers);
  } else {
    map.addSource('stations', { type: 'geojson', data: stationMarkers });
    map.addLayer({
      id: 'station-markers',
      type: 'circle',
      source: 'stations',
      paint: {
        'circle-color': '#39c7f3',
        'circle-radius': 6,
        'circle-stroke-color': '#e8eef2',
        'circle-stroke-width': 2,
      },
    });
  }

  if (bounds) {
    map.fitBounds(bounds, { padding: 48, maxZoom: 14 });
  }
}

export function Map({ itinerary, stopsIndex }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-73.98, 40.75],
      zoom: 12,
    });
    map.on('load', () => muteBasemap(map));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;
    const draw = () => {
      if (!cancelled && map.isStyleLoaded()) {
        drawItinerary(map, itinerary, stopsIndex);
      }
    };

    // Run immediately if the style is ready (e.g. re-selecting an itinerary);
    // otherwise wait for the one-time load. `on('load')` added after load never
    // fires, which previously left the map stale on re-selection.
    if (map.isStyleLoaded()) {
      draw();
    } else {
      map.once('load', draw);
    }

    return () => {
      cancelled = true;
      map.off('load', draw);
    };
  }, [itinerary, stopsIndex]);

  return <div ref={containerRef} className={styles.container} data-testid="map-container" />;
}
