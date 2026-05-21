/**
 * Integration test for the GTFS static pipeline.
 *
 * Issue #3 acceptance criterion: "An integration test confirms a known station
 * resolves through the in-memory StopsIndex after load."
 *
 * Exercises the real production code path end-to-end:
 *   trimmed GTFS zip → buildTimetable → .pb buffers → loadTimetable → StopsIndex.
 *
 * No network. No mocks of the parser or serializer. The only stub is `fetch`,
 * which serves the buffers the build step just produced.
 */

import {
  FIXTURE_KNOWN_STOP_NAME,
  FIXTURE_KNOWN_STOP_SOURCE_ID,
  buildFixtureBuffers,
  makeBufferFetch,
  type FixtureBuffers,
} from '../../tests/helpers/fixtures';
import { DEFAULT_STOPS_URL, DEFAULT_TIMETABLE_URL, loadTimetable } from './loader';

describe('GTFS static pipeline integration', () => {
  let buffers: FixtureBuffers;

  beforeAll(async () => {
    buffers = await buildFixtureBuffers();
  });

  afterAll(async () => {
    await buffers.cleanup();
  });

  it('produces non-empty timetable and stops protobufs from the trimmed fixture', () => {
    expect(buffers.timetableBytes).toBeGreaterThan(0);
    expect(buffers.stopsBytes).toBeGreaterThan(0);
  });

  it('resolves a known station through the in-memory StopsIndex after load', async () => {
    const fetchStub = makeBufferFetch({
      [DEFAULT_TIMETABLE_URL]: buffers.timetable,
      [DEFAULT_STOPS_URL]: buffers.stops,
    });

    const { stopsIndex } = await loadTimetable({ fetch: fetchStub });
    const stop = stopsIndex.findStopBySourceStopId(FIXTURE_KNOWN_STOP_SOURCE_ID);

    expect(stop).toBeDefined();
    expect(stop?.name).toBe(FIXTURE_KNOWN_STOP_NAME);
  });

  it('also resolves the station by partial name search', async () => {
    const fetchStub = makeBufferFetch({
      [DEFAULT_TIMETABLE_URL]: buffers.timetable,
      [DEFAULT_STOPS_URL]: buffers.stops,
    });

    const { stopsIndex } = await loadTimetable({ fetch: fetchStub });
    const matches = stopsIndex.findStopsByName('Times Sq');

    expect(matches.map((s) => s.name)).toContain(FIXTURE_KNOWN_STOP_NAME);
  });
});
