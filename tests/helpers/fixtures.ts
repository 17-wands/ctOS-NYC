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
import { buildScheduleAssets, buildTimetable } from '../../scripts/build-timetable';
import type { ScheduleManifest } from '../../src/timetable/loader';

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

/** Default service days for the windowed fixture (3 consecutive weekdays). */
export const FIXTURE_WINDOW_DATES = ['2026-05-20', '2026-05-21', '2026-05-22'];

/** Base URL the fixture window is served from (mimics a Blob `schedule/` prefix). */
export const FIXTURE_BASE_URL = 'https://fixture.test/schedule/';

export type FixtureWindow = {
  /** Absolute manifest URL to pass as `loadTimetable({ manifestUrl })`. */
  manifestUrl: string;
  manifest: ScheduleManifest;
  /** fetch stub serving the manifest + every asset; 404 otherwise. */
  fetch: typeof globalThis.fetch;
  serviceDates: string[];
};

/**
 * Build a windowed schedule fixture (manifest + per-day timetables + shared
 * stops) entirely in memory, plus a `fetch` stub that serves them at sibling
 * URLs under {@link FIXTURE_BASE_URL}. Mirrors what the Blob publisher produces.
 */
export async function buildFixtureWindow(
  opts: { serviceDates?: string[]; now?: Date } = {},
): Promise<FixtureWindow> {
  const serviceDates = opts.serviceDates ?? FIXTURE_WINDOW_DATES;
  const assets = await buildScheduleAssets({
    source: FIXTURE_ZIP,
    dates: serviceDates.map((serviceDate) => ({
      serviceDate,
      date: new Date(`${serviceDate}T12:00:00Z`),
    })),
  });

  const publishedAt = (opts.now ?? new Date('2026-05-20T12:00:00Z')).toISOString();
  const stopsPath = `stops-${assets.feedVersion}.pb`;
  const manifest: ScheduleManifest = {
    version: 1,
    feedVersion: assets.feedVersion,
    feedPublishedAt: publishedAt,
    stopsPath,
    days: assets.days.map((d) => ({
      serviceDate: d.serviceDate,
      path: `timetable-${d.serviceDate}.pb`,
      publishedAt,
    })),
  };

  const store = new Map<string, Uint8Array | string>();
  store.set(`${FIXTURE_BASE_URL}manifest.json`, JSON.stringify(manifest));
  store.set(`${FIXTURE_BASE_URL}${stopsPath}`, assets.stops);
  for (const d of assets.days) {
    store.set(`${FIXTURE_BASE_URL}timetable-${d.serviceDate}.pb`, d.bytes);
  }

  const fetchStub: typeof globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.toString();
    const body = store.get(url);
    if (body === undefined) {
      return new Response(null, { status: 404, statusText: 'Not Found' });
    }
    if (typeof body === 'string') {
      return new Response(body, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(body as BodyInit, { status: 200 });
  };

  return {
    manifestUrl: `${FIXTURE_BASE_URL}manifest.json`,
    manifest,
    fetch: fetchStub,
    serviceDates: assets.days.map((d) => d.serviceDate),
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
