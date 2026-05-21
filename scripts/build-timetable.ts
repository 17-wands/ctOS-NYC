/**
 * Build script for the in-memory transit timetable.
 *
 * Downloads (or accepts) a GTFS static zip, parses it through minotor's
 * `GtfsParser`, and writes two serialized protobufs — `timetable.pb` and
 * `stops.pb` — into the output directory. The browser loader (see
 * `src/timetable/loader.ts`) consumes these as static assets at startup.
 *
 * Designed to run from Node either as a CLI (`npm run build:timetable`) or
 * as a library (`buildTimetable(...)` from tests).
 *
 * Reference: ARCHITECTURE.md §4, §6.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  GtfsParser,
  extendedGtfsProfile,
  standardGtfsProfile,
  type GtfsProfile,
} from 'minotor/parser';

/** Canonical MTA subway GTFS-static feed. Public; no API key. */
export const MTA_SUBWAY_GTFS_URL =
  'http://web.mta.info/developers/data/nyct/subway/google_transit.zip';

/** Default asset directory; matches Vite's static asset convention. */
export const DEFAULT_OUT_DIR = 'public';

export type BuildOptions = {
  /** http(s) URL to download, or a local filesystem path to an existing zip. */
  source: string;
  /** Directory the `.pb` files are written to. Created if it does not exist. */
  outDir: string;
  /** Active service date used by `parseTimetable`. Defaults to today. */
  date?: Date;
  /**
   * Route-type profile. Defaults to `standardGtfsProfile`. NYC MTA subway
   * uses `route_type=1` (standard). Feeds using extended types (100s/400s/700s)
   * require `extendedGtfsProfile`.
   */
  profile?: GtfsProfile;
};

export type BuildResult = {
  /** Absolute path of the serialized timetable. */
  timetablePath: string;
  /** Absolute path of the serialized stops index. */
  stopsPath: string;
  /** Byte length of `timetable.pb`. */
  timetableBytes: number;
  /** Byte length of `stops.pb`. */
  stopsBytes: number;
};

/**
 * Build serialized timetable + stops protobufs from a GTFS source.
 *
 * @throws If the source cannot be fetched or read, or if the parsed feed
 *   contains zero stops (a signal the input is malformed or the wrong
 *   route-type profile was used).
 */
export async function buildTimetable(opts: BuildOptions): Promise<BuildResult> {
  const date = opts.date ?? new Date();
  const profile = opts.profile ?? standardGtfsProfile;
  const outDir = resolve(opts.outDir);

  await mkdir(outDir, { recursive: true });

  const { path: zipPath, cleanup } = await resolveZipPath(opts.source);
  try {
    const parser = new GtfsParser(zipPath, profile);
    const timetable = await parser.parseTimetable(date);
    const stopsIndex = await parser.parseStops();

    if (stopsIndex.size() === 0) {
      throw new Error(
        `Parsed feed contains zero stops. Source=${opts.source}. ` +
          `If this is a feed that uses extended GTFS route types, pass profile=extended.`,
      );
    }

    const timetableBuf = timetable.serialize();
    const stopsBuf = stopsIndex.serialize();

    const timetablePath = join(outDir, 'timetable.pb');
    const stopsPath = join(outDir, 'stops.pb');

    await writeFile(timetablePath, timetableBuf);
    await writeFile(stopsPath, stopsBuf);

    return {
      timetablePath,
      stopsPath,
      timetableBytes: timetableBuf.byteLength,
      stopsBytes: stopsBuf.byteLength,
    };
  } finally {
    await cleanup();
  }
}

/**
 * Resolve the GTFS source to a local zip path. URLs are downloaded to a
 * tmp file; local paths are returned as-is.
 */
async function resolveZipPath(
  source: string,
): Promise<{ path: string; cleanup: () => Promise<void> }> {
  if (isHttpUrl(source)) {
    const tmpPath = join(tmpdir(), `gtfs-${randomUUID()}.zip`);
    await downloadTo(source, tmpPath);
    return {
      path: tmpPath,
      cleanup: async () => {
        await rm(tmpPath, { force: true });
      },
    };
  }
  return { path: resolve(source), cleanup: async () => {} };
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

async function downloadTo(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText} (${url})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destPath, buffer);
}

/**
 * CLI entry point.
 *
 * Usage:
 *   npm run build:timetable -- [--source <url-or-path>] [--out <dir>]
 *                              [--date YYYY-MM-DD] [--profile standard|extended]
 */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      source: { type: 'string', default: MTA_SUBWAY_GTFS_URL },
      out: { type: 'string', default: DEFAULT_OUT_DIR },
      date: { type: 'string' },
      profile: { type: 'string', default: 'standard' },
    },
    strict: true,
    allowPositionals: false,
  });

  const profile = values.profile === 'extended' ? extendedGtfsProfile : standardGtfsProfile;

  const date = values.date ? parseIsoDate(values.date) : new Date();

  console.log(`[build-timetable] source=${values.source}`);
  console.log(`[build-timetable] out=${values.out} date=${date.toISOString()}`);

  const start = performance.now();
  const result = await buildTimetable({
    source: values.source!,
    outDir: values.out!,
    date,
    profile,
  });
  const elapsed = (performance.now() - start) / 1000;

  console.log(
    `[build-timetable] wrote ${result.timetablePath} ` +
      `(${formatBytes(result.timetableBytes)}) and ${result.stopsPath} ` +
      `(${formatBytes(result.stopsBytes)}) in ${elapsed.toFixed(1)}s`,
  );
}

function parseIsoDate(value: string): Date {
  // Accept YYYY-MM-DD; interpret at local noon to avoid timezone-edge service skips.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`--date must be YYYY-MM-DD, got "${value}"`);
  }
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Run as CLI when invoked directly (tsx scripts/build-timetable.ts).
const invokedDirectly =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (invokedDirectly) {
  main().catch((err) => {
    console.error('[build-timetable] failed:', err);
    process.exitCode = 1;
  });
}
