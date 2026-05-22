/**
 * Integration test for the GTFS static pipeline.
 *
 * Exercises the real production path end-to-end, now manifest-driven:
 *   trimmed GTFS zip -> buildScheduleAssets -> manifest + per-day .pb buffers
 *   -> loadTimetable -> StopsIndex + per-day Routers.
 *
 * No network and no mocks of the parser/serializer/loader; the only stub is
 * `fetch`, which serves the buffers the build step produced.
 */

import {
  FIXTURE_KNOWN_STOP_NAME,
  FIXTURE_KNOWN_STOP_SOURCE_ID,
  buildFixtureWindow,
  type FixtureWindow,
} from '../../tests/helpers/fixtures';
import { loadTimetable } from './loader';

describe('GTFS static pipeline integration', () => {
  let window: FixtureWindow;

  beforeAll(async () => {
    window = await buildFixtureWindow();
  });

  it('loads a router for every published service day', async () => {
    const bundle = await loadTimetable({ manifestUrl: window.manifestUrl, fetch: window.fetch });
    expect(bundle.days.map((d) => d.serviceDate)).toEqual(window.serviceDates);
    expect(bundle.days).toHaveLength(3);
  });

  it('resolves a known station through the in-memory StopsIndex after load', async () => {
    const { stopsIndex } = await loadTimetable({
      manifestUrl: window.manifestUrl,
      fetch: window.fetch,
    });
    const stop = stopsIndex.findStopBySourceStopId(FIXTURE_KNOWN_STOP_SOURCE_ID);
    expect(stop).toBeDefined();
    expect(stop?.name).toBe(FIXTURE_KNOWN_STOP_NAME);
  });

  it('also resolves the station by partial name search', async () => {
    const { stopsIndex } = await loadTimetable({
      manifestUrl: window.manifestUrl,
      fetch: window.fetch,
    });
    expect(stopsIndex.findStopsByName('Times Sq').map((s) => s.name)).toContain(
      FIXTURE_KNOWN_STOP_NAME,
    );
  });
});
