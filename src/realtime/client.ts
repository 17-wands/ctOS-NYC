import type { RealtimeResponse } from './types';

/**
 * Fetches realtime data from /api/realtime.
 * Returns null on error (graceful degradation).
 */
export async function fetchRealtimeData(): Promise<RealtimeResponse | null> {
  try {
    const response = await fetch('/api/realtime');
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch realtime data:', error);
    return null;
  }
}
