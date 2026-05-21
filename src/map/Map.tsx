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

    map.on('load', () => {
      map.setPaintProperty('background', 'background-color', '#101317');

      const waterLayers = ['water', 'waterway'];
      waterLayers.forEach((layer) => {
        if (map.getLayer(layer)) {
          map.setPaintProperty(layer, 'fill-color', '#050608');
        }
      });

      const roadLayers = ['road', 'highway', 'road_major', 'road_minor'];
      roadLayers.forEach((layer) => {
        if (map.getLayer(layer)) {
          map.setPaintProperty(layer, 'line-color', '#2A3139');
        }
      });

      const textLayers = map.getStyle().layers?.filter((l) => l.type === 'symbol') || [];
      textLayers.forEach((layer) => {
        if (map.getLayer(layer.id)) {
          map.setPaintProperty(layer.id, 'text-color', '#7D8792');
        }
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.on('load', () => {
      const routeTrace = buildRouteTrace(itinerary, stopsIndex);
      const stationMarkers = buildStationMarkers(itinerary, stopsIndex);
      const bounds = calculateRouteBounds(itinerary, stopsIndex);

      if (map.getSource('route')) {
        (map.getSource('route') as maplibregl.GeoJSONSource).setData(routeTrace);
      } else {
        map.addSource('route', {
          type: 'geojson',
          data: routeTrace,
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          paint: {
            'line-color': '#39C7F3',
            'line-width': 4,
          },
        });
      }

      if (map.getSource('stations')) {
        (map.getSource('stations') as maplibregl.GeoJSONSource).setData(stationMarkers);
      } else {
        map.addSource('stations', {
          type: 'geojson',
          data: stationMarkers,
        });

        map.addLayer({
          id: 'station-markers',
          type: 'circle',
          source: 'stations',
          paint: {
            'circle-color': '#39C7F3',
            'circle-radius': 6,
            'circle-stroke-color': '#E8EEF2',
            'circle-stroke-width': 2,
          },
        });
      }

      if (bounds) {
        map.fitBounds(bounds, { padding: 40 });
      }
    });
  }, [itinerary, stopsIndex]);

  return <div ref={containerRef} className={styles.container} data-testid="map-container" />;
}
