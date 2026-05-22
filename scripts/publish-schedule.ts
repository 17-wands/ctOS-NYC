/**
 * Publish the rolling schedule window to Vercel Blob.
 *
 * Builds the now->+48h window (see `build-schedule-window.ts`), uploads the
 * immutable per-day timetables and shared stops index once, and overwrites the
 * mutable `manifest.json` pointer. The app reads the manifest at runtime, so
 * refreshing the schedule never requires an app redeploy (see #25).
 *
 * Runs from a scheduled GitHub Action (`.github/workflows/schedule-refresh.yml`)
 * or locally as `npm run publish:schedule` with `BLOB_READ_WRITE_TOKEN` set.
 *
 * Reference: ARCHITECTURE.md sections 6, 11.
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { list as blobList, put as blobPut } from '@vercel/blob';
import { StopsIndex, Timetable } from 'minotor';
import { extendedGtfsProfile, standardGtfsProfile, type GtfsProfile } from 'minotor/parser';
import { MTA_SUBWAY_GTFS_URL } from './build-timetable';
import { buildScheduleWindow, type ScheduleManifest } from './build-schedule-window';

/** Pathname prefix for all schedule blobs. */
export const DEFAULT_BLOB_PREFIX = 'schedule';

const ONE_MONTH_SECONDS = 60 * 60 * 24 * 30;
/** Vercel Blob enforces a 60s floor; the manifest is the only mutable pointer. */
const MANIFEST_CACHE_SECONDS = 60;

/** Options the publisher passes to `put`. Mirrors the slice of `@vercel/blob` used. */
type BlobPutOptions = {
  access: 'public';
  contentType?: string;
  addRandomSuffix?: boolean;
  allowOverwrite?: boolean;
  cacheControlMaxAge?: number;
};

/** Minimal `@vercel/blob` surface the publisher needs; injectable for tests. */
export type BlobClient = {
  put: (
    pathname: string,
    body: Uint8Array | string,
    opts: BlobPutOptions,
  ) => Promise<{ url: string; pathname: string }>;
  list: (opts: { prefix?: string }) => Promise<{ blobs: Array<{ pathname: string }> }>;
};

/** Build a real Blob client bound to a read/write token. */
export function createBlobClient(token: string): BlobClient {
  return {
    // `@vercel/blob` accepts a Buffer but not a bare Uint8Array; coerce here.
    put: (pathname, body, opts) =>
      blobPut(pathname, typeof body === 'string' ? body : Buffer.from(body), { ...opts, token }),
    list: (opts) => blobList({ ...opts, token }),
  };
}

export type PublishOptions = {
  /** http(s) URL to download, or a local zip path. */
  source: string;
  /** Blob client (real or fake). */
  blob: BlobClient;
  /** Pathname prefix. Defaults to `schedule`. */
  prefix?: string;
  /** First service date (YYYY-MM-DD). Defaults to today in the schedule zone. */
  baseDate?: string;
  /** Number of consecutive service days. */
  days?: number;
  /** Route-type profile. Defaults to standard. */
  profile?: GtfsProfile;
  /** Clock injection for deterministic tests. */
  now?: Date;
};

export type PublishResult = {
  /** Public URL of the uploaded manifest. */
  manifestUrl: string;
  /** Pathnames newly uploaded this run. */
  uploaded: string[];
  /** Immutable pathnames already present and skipped. */
  skipped: string[];
  /** The manifest that was published. */
  manifest: ScheduleManifest;
};

/**
 * Build and publish the schedule window. Immutable assets (stops + day-files)
 * are uploaded only if absent; the manifest is always overwritten.
 */
export async function publishSchedule(opts: PublishOptions): Promise<PublishResult> {
  const prefix = opts.prefix ?? DEFAULT_BLOB_PREFIX;
  const workDir = await mkdtemp(join(tmpdir(), 'publish-schedule-'));

  try {
    const { manifest } = await buildScheduleWindow({
      source: opts.source,
      outDir: workDir,
      baseDate: opts.baseDate,
      days: opts.days,
      profile: opts.profile,
      now: opts.now,
    });

    const existing = new Set((await opts.blob.list({ prefix })).blobs.map((b) => b.pathname));
    const uploaded: string[] = [];
    const skipped: string[] = [];

    const immutableNames = [manifest.stopsPath, ...manifest.days.map((d) => d.path)];
    for (const name of immutableNames) {
      const pathname = `${prefix}/${name}`;
      if (existing.has(pathname)) {
        skipped.push(pathname);
        continue;
      }
      const bytes = new Uint8Array(await readFile(join(workDir, name)));
      await opts.blob.put(pathname, bytes, {
        access: 'public',
        contentType: 'application/octet-stream',
        addRandomSuffix: false,
        cacheControlMaxAge: ONE_MONTH_SECONDS,
      });
      uploaded.push(pathname);
    }

    const manifestPathname = `${prefix}/manifest.json`;
    const manifestBody = `${JSON.stringify(manifest, null, 2)}\n`;
    const putResult = await opts.blob.put(manifestPathname, manifestBody, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: MANIFEST_CACHE_SECONDS,
    });

    return { manifestUrl: putResult.url, uploaded, skipped, manifest };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export type VerifyResult = {
  serviceDate: string;
  stopCount: number;
};

/**
 * Freshness check: fetch the published manifest, then fetch and deserialize the
 * shared stops index and the newest day-file. Throws if anything is missing or
 * fails to decode. Used by the scheduled Action to assert an end-to-end publish.
 */
export async function verifyPublishedSchedule(
  manifestUrl: string,
  opts: { fetchImpl?: typeof globalThis.fetch } = {},
): Promise<VerifyResult> {
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;

  const manifest = (await fetchJson(fetchImpl, manifestUrl)) as ScheduleManifest;
  const newest = manifest.days.at(-1);
  if (!newest) {
    throw new Error(`Published manifest at ${manifestUrl} has no day-files`);
  }

  const stopsUrl = new URL(manifest.stopsPath, manifestUrl).toString();
  const dayUrl = new URL(newest.path, manifestUrl).toString();

  const [stopsBytes, dayBytes] = await Promise.all([
    fetchBytes(fetchImpl, stopsUrl),
    fetchBytes(fetchImpl, dayUrl),
  ]);

  const stopsIndex = StopsIndex.fromData(stopsBytes); // throws on decode failure
  Timetable.fromData(dayBytes); // throws on decode failure

  return { serviceDate: newest.serviceDate, stopCount: stopsIndex.size() };
}

async function fetchJson(fetchImpl: typeof globalThis.fetch, url: string): Promise<unknown> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Fetch ${url} returned HTTP ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchBytes(fetchImpl: typeof globalThis.fetch, url: string): Promise<Uint8Array> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Fetch ${url} returned HTTP ${response.status} ${response.statusText}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * CLI entry point.
 *
 * Usage:
 *   npm run publish:schedule -- [--source <url-or-path>] [--prefix <p>]
 *                               [--base-date YYYY-MM-DD] [--days N]
 *                               [--profile standard|extended] [--skip-verify]
 *
 * Requires BLOB_READ_WRITE_TOKEN in the environment.
 */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      source: { type: 'string', default: MTA_SUBWAY_GTFS_URL },
      prefix: { type: 'string', default: DEFAULT_BLOB_PREFIX },
      'base-date': { type: 'string' },
      days: { type: 'string' },
      profile: { type: 'string', default: 'standard' },
      'skip-verify': { type: 'boolean', default: false },
    },
    strict: true,
    allowPositionals: false,
  });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not set.');
  }

  const profile = values.profile === 'extended' ? extendedGtfsProfile : standardGtfsProfile;
  const days = values.days ? Number(values.days) : undefined;
  if (days !== undefined && (!Number.isInteger(days) || days < 1)) {
    throw new Error(`--days must be a positive integer, got "${values.days}"`);
  }

  console.log(`[publish-schedule] source=${values.source} prefix=${values.prefix}`);

  const result = await publishSchedule({
    source: values.source!,
    blob: createBlobClient(token),
    prefix: values.prefix,
    baseDate: values['base-date'],
    days,
    profile,
  });

  console.log(
    `[publish-schedule] manifest=${result.manifestUrl} ` +
      `uploaded=${result.uploaded.length} skipped=${result.skipped.length} ` +
      `days=[${result.manifest.days.map((d) => d.serviceDate).join(', ')}]`,
  );

  if (!values['skip-verify']) {
    const verified = await verifyPublishedSchedule(result.manifestUrl);
    console.log(
      `[publish-schedule] verified newest day ${verified.serviceDate} ` +
        `(${verified.stopCount} stops) deserializes`,
    );
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (invokedDirectly) {
  main().catch((err) => {
    console.error('[publish-schedule] failed:', err);
    process.exitCode = 1;
  });
}
