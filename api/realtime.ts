import type { NextRequest } from 'next/server';
import { transit_realtime } from 'gtfs-realtime-bindings';
import {
  normalizeAlerts,
  normalizeTripDelays,
  normalizeAccessibilityOutages,
} from '../src/realtime/normalizer';
import type { RealtimeResponse } from '../src/realtime/types';

export const config = {
  runtime: 'edge',
};

/**
 * Hard-coded allowlist of MTA feed URLs.
 * Per ARCHITECTURE.md §7 and §12: no request-controlled targets, fixed URLs only.
 */
const MTA_FEEDS = {
  tripUpdates: [
    'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',
    'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
    'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g',
    'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz',
    'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw',
    'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l',
    'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs',
  ],
  alerts: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts',
  accessibility: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene',
};

/**
 * Fetches a single MTA feed with timeout and error handling.
 */
async function fetchFeed(url: string): Promise<transit_realtime.FeedMessage | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`Failed to fetch feed from ${url}: ${response.status}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    return transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
  } catch (error) {
    console.error(`Error fetching feed from ${url}:`, error);
    return null;
  }
}

/**
 * Vercel Edge Function handler for GET /api/realtime.
 * Fetches MTA GTFS-realtime feeds, parses protobuf, normalizes to JSON contract.
 * Per ARCHITECTURE.md §7: caches ~30s, returns CORS headers, logs no identifying info.
 */
export default async function handler(req: NextRequest): Promise<Response> {
  // Only accept GET
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        Allow: 'GET',
      },
    });
  }

  try {
    // Fetch all feeds in parallel
    const [alertsFeed, accessibilityFeed, ...tripUpdateFeeds] = await Promise.all([
      fetchFeed(MTA_FEEDS.alerts),
      fetchFeed(MTA_FEEDS.accessibility),
      ...MTA_FEEDS.tripUpdates.map((url) => fetchFeed(url)),
    ]);

    // Normalize to JSON contract (gracefully handle null feeds)
    const alerts = alertsFeed ? normalizeAlerts(alertsFeed) : [];
    const accessibilityOutages = accessibilityFeed
      ? normalizeAccessibilityOutages(accessibilityFeed)
      : [];
    const tripDelays = normalizeTripDelays(tripUpdateFeeds.filter((f) => f !== null));

    const response: RealtimeResponse = {
      generatedAt: new Date().toISOString(),
      alerts,
      tripDelays,
      accessibilityOutages,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, s-maxage=30',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error processing realtime feeds:', error);

    // Return empty response on error (graceful degradation)
    const errorResponse: RealtimeResponse = {
      generatedAt: new Date().toISOString(),
      alerts: [],
      tripDelays: [],
      accessibilityOutages: [],
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30, s-maxage=30',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
}
