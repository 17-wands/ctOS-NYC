/**
 * Build a rolling schedule window.
 *
 * Produces the immutable per-day timetable assets that cover a now->+48h window,
 * a single shared stops index, and a `manifest.json` describing them. The client
 * (see `src/timetable/loader.ts`, Stage 3) reads the manifest and fetches only the
 * day-files spanning its current 48 hours, so freshness comes from the client's
 * day selection rather than from rebuild frequency or app redeploys.
 *
 * Designed to run from Node as a CLI (`npm run build:schedule-window`) or as a
 * library (`buildScheduleWindow(...)` from tests / the publisher in Stage 2).
 *
 * Reference: ARCHITECTURE.md sections 4, 6.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { buildScheduleAssets, MTA_SUBWAY_GTFS_URL, type DateSpec } from './build-timetable';
import { extendedGtfsProfile, standardGtfsProfile, type GtfsProfile } from 'minotor/parser';

/** IANA zone the MTA subway schedule is anchored to. */
export const SCHEDULE_TIMEZONE = 'America/New_York';

/**
 * Number of consecutive service days to mint by default. A 48h window can touch
 * three local calendar dates (e.g. an 11pm "now" plus 48h lands two dates later),
 * so three day-files guarantee full coverage from any time of day.
 */
export const DEFAULT_WINDOW_DAYS = 3;

/** Schema for the published `manifest.json`. The client treats this as the source of truth. */
export type ScheduleManifest = {
  version: 1;
  /** Content hash of the stops buffer; changes when the feed's stop set/order changes. */
  feedVersion: string;
  /** When this window was built/published (ISO-8601). */
  feedPublishedAt: string;
  /** Relative path/filename of the shared stops index. */
  stopsPath: string;
  /** Available service days, ascending. */
  days: Array<{ serviceDate: string; path: string; publishedAt: string }>;
};

/** Today's date (YYYY-MM-DD) in the given IANA time zone. */
export function todayInTimeZone(
  timeZone: string = SCHEDULE_TIMEZONE,
  now: Date = new Date(),
): string {
  // en-CA formats as ISO-style YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

/**
 * Enumerate `count` consecutive calendar dates (YYYY-MM-DD) starting at `startDate`.
 * Uses noon-UTC day arithmetic so month/year rollovers and DST are handled cleanly.
 */
export function enumerateServiceDates(startDate: string, count: number): string[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!match) {
    throw new Error(`startDate must be YYYY-MM-DD, got "${startDate}"`);
  }
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);

  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const dt = new Date(Date.UTC(year, month - 1, day + i, 12));
    dates.push(dt.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Map a service-date label to the instant minotor parses. Noon UTC keeps the
 * calendar day stable for minotor's day lookup under a UTC CI runner. Precise
 * NYC-local instant anchoring is a runtime concern handled in Stage 3.
 */
function serviceDateToParseDate(serviceDate: string): Date {
  return new Date(`${serviceDate}T12:00:00Z`);
}

export type BuildWindowOptions = {
  /** http(s) URL to download, or a local zip path. */
  source: string;
  /** Directory the `.pb` files and `manifest.json` are written to. */
  outDir: string;
  /** First service date (YYYY-MM-DD). Defaults to today in `SCHEDULE_TIMEZONE`. */
  baseDate?: string;
  /** Number of consecutive service days. Defaults to `DEFAULT_WINDOW_DAYS`. */
  days?: number;
  /** Route-type profile. Defaults to standard (NYC subway uses route_type=1). */
  profile?: GtfsProfile;
  /** Clock injection for deterministic tests. */
  now?: Date;
};

export type BuildWindowResult = {
  outDir: string;
  manifestPath: string;
  manifest: ScheduleManifest;
};

/**
 * Build the windowed schedule assets and manifest into `outDir`.
 */
export async function buildScheduleWindow(opts: BuildWindowOptions): Promise<BuildWindowResult> {
  const now = opts.now ?? new Date();
  const baseDate = opts.baseDate ?? todayInTimeZone(SCHEDULE_TIMEZONE, now);
  const count = opts.days ?? DEFAULT_WINDOW_DAYS;

  const serviceDates = enumerateServiceDates(baseDate, count);
  const dates: DateSpec[] = serviceDates.map((serviceDate) => ({
    serviceDate,
    date: serviceDateToParseDate(serviceDate),
  }));

  const assets = await buildScheduleAssets({ source: opts.source, dates, profile: opts.profile });

  const outDir = resolve(opts.outDir);
  await mkdir(outDir, { recursive: true });

  const publishedAt = now.toISOString();
  const stopsPath = `stops-${assets.feedVersion}.pb`;
  await writeFile(join(outDir, stopsPath), assets.stops);

  const days: ScheduleManifest['days'] = [];
  for (const day of assets.days) {
    const path = `timetable-${day.serviceDate}.pb`;
    await writeFile(join(outDir, path), day.bytes);
    days.push({ serviceDate: day.serviceDate, path, publishedAt });
  }

  const manifest: ScheduleManifest = {
    version: 1,
    feedVersion: assets.feedVersion,
    feedPublishedAt: publishedAt,
    stopsPath,
    days,
  };
  const manifestPath = join(outDir, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return { outDir, manifestPath, manifest };
}

/**
 * CLI entry point.
 *
 * Usage:
 *   npm run build:schedule-window -- [--source <url-or-path>] [--out <dir>]
 *                                    [--base-date YYYY-MM-DD] [--days N]
 *                                    [--profile standard|extended]
 */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      source: { type: 'string', default: MTA_SUBWAY_GTFS_URL },
      out: { type: 'string', default: 'public/schedule' },
      'base-date': { type: 'string' },
      days: { type: 'string' },
      profile: { type: 'string', default: 'standard' },
    },
    strict: true,
    allowPositionals: false,
  });

  const profile = values.profile === 'extended' ? extendedGtfsProfile : standardGtfsProfile;
  const days = values.days ? Number(values.days) : undefined;
  if (days !== undefined && (!Number.isInteger(days) || days < 1)) {
    throw new Error(`--days must be a positive integer, got "${values.days}"`);
  }

  console.log(`[build-schedule-window] source=${values.source}`);

  const start = performance.now();
  const result = await buildScheduleWindow({
    source: values.source!,
    outDir: values.out!,
    baseDate: values['base-date'],
    days,
    profile,
  });
  const elapsed = (performance.now() - start) / 1000;

  const dayList = result.manifest.days.map((d) => d.serviceDate).join(', ');
  console.log(
    `[build-schedule-window] wrote ${result.manifest.days.length} day-file(s) [${dayList}] ` +
      `+ ${result.manifest.stopsPath} + manifest.json to ${result.outDir} in ${elapsed.toFixed(1)}s`,
  );
}

const invokedDirectly =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (invokedDirectly) {
  main().catch((err) => {
    console.error('[build-schedule-window] failed:', err);
    process.exitCode = 1;
  });
}
