/**
 * Test helpers for the trimmed MTA GTFS fixture.
 *
 * The shape of the fixture (5 southbound stops on the 1 line) is documented in
 * `tests/fixtures/gtfs-mini/README.md`. These helpers run the same build
 * pipeline production uses, then surface the resulting protobuf buffers so the
 * loader and integration tests can drive a stubbed `fetch`.
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildTimetable } from '../../scripts/build-timetable';

/** Path to the trimmed GTFS zip fixture, relative to the repo root. */
export const FIXTURE_ZIP = resolve(import.meta.dirname, '..', 'fixtures', 'gtfs-mini.zip');

/** A weekday inside `calendar.txt`'s `WKD` service range. */
export const FIXTURE_DATE = new Date(2026, 4, 20, 12, 0, 0); // Wed 2026-05-20

/** Source stop ID present in the fixture (Times Sq-42 St, southbound). */
export const FIXTURE_KNOWN_STOP_SOURCE_ID = '132S';

/** Expected display name for `FIXTURE_KNOWN_STOP_SOURCE_ID`. */
export const FIXTURE_KNOWN_STOP_NAME = 'Times Sq-42 St';

export type FixtureBuffers = {
  timetable: Uint8Array;
  stops: Uint8Array;
  timetableBytes: number;
  stopsBytes: number;
  cleanup: () => Promise<void>;
};

/**
 * Build the fixture through the production build script and return the
 * serialized buffers. The caller must `await cleanup()` to remove the tmp dir.
 */
export async function buildFixtureBuffers(): Promise<FixtureBuffers> {
  const outDir = await mkdtemp(join(tmpdir(), 'gtfs-fixture-'));
  const result = await buildTimetable({
    source: FIXTURE_ZIP,
    outDir,
    date: FIXTURE_DATE,
  });
  const [timetable, stops] = await Promise.all([
    readFile(result.timetablePath),
    readFile(result.stopsPath),
  ]);
  return {
    timetable: new Uint8Array(timetable),
    stops: new Uint8Array(stops),
    timetableBytes: result.timetableBytes,
    stopsBytes: result.stopsBytes,
    cleanup: async () => {
      await rm(outDir, { recursive: true, force: true });
    },
  };
}

/**
 * Build a `fetch` stub that returns the given buffers for the matching URLs and
 * a 404 for anything else. Use with `vi.stubGlobal('fetch', ...)` in tests.
 */
export function makeBufferFetch(responses: Record<string, Uint8Array>): typeof globalThis.fetch {
  return async (input) => {
    const url = typeof input === 'string' ? input : input.toString();
    const body = responses[url];
    if (!body) {
      return new Response(null, { status: 404, statusText: 'Not Found' });
    }
    // `Uint8Array<ArrayBufferLike>` (the default since TS 5.7) is not directly
    // assignable to `BodyInit`, which wants `ArrayBufferView<ArrayBuffer>`.
    // The runtime accepts Uint8Array; the cast just narrows the static type.
    return new Response(body as BodyInit, { status: 200, statusText: 'OK' });
  };
}
