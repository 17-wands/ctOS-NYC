/**
 * Timetable loader.
 *
 * Fetches the schedule `manifest.json` published by `scripts/publish-schedule.ts`,
 * then loads the per-day timetables it lists plus the shared stops index, and
 * builds one minotor `Router` per service day (all sharing the single
 * `StopsIndex`). The client holds the whole now->+48h window so it can plan
 * across midnight; the routing layer selects the right day per query.
 *
 * Reference: ARCHITECTURE.md sections 4 (data model), 6 (pipeline).
 */

import { Router, StopsIndex, Timetable } from 'minotor';

/** Default manifest URL. Same-origin in dev; overridable to the Blob URL in prod. */
export const DEFAULT_MANIFEST_URL = '/schedule/manifest.json';

/**
 * Stages of the load pipeline, in order. The boot UI subscribes via `onStage`
 * and renders each as a segmented progress step.
 */
export const LOAD_STAGES = ['fetch', 'deserialize', 'router'] as const;

export type LoadStage = (typeof LOAD_STAGES)[number];

/** The published manifest shape (mirrors `scripts/build-schedule-window.ts`). */
export type ScheduleManifest = {
  version: number;
  feedVersion: string;
  feedPublishedAt: string;
  stopsPath: string;
  days: Array<{ serviceDate: string; path: string; publishedAt: string }>;
};

/** One loaded service day: its date label and a router over that day's timetable. */
export type ScheduleDay = {
  serviceDate: string;
  router: Router;
};

/** In-memory transit bundle ready for routing queries across the window. */
export type TimetableBundle = {
  /** Shared, date-independent stops index. */
  stopsIndex: StopsIndex;
  /** Loaded service days (ascending), each with its own router. */
  days: ScheduleDay[];
  /** Content version of the schedule (from the manifest). */
  feedVersion: string;
  /** When the schedule window was published (ISO-8601), for the freshness UI. */
  feedPublishedAt: string;
};

export type LoadOptions = {
  /** Manifest URL. Defaults to `VITE_SCHEDULE_MANIFEST_URL` or `/schedule/manifest.json`. */
  manifestUrl?: string;
  /** Custom fetch implementation. Defaults to `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch;
  /** Optional abort signal. Aborts the in-flight fetches. */
  signal?: AbortSignal;
  /** Called as each load stage begins. Used by the boot UI. */
  onStage?: (stage: LoadStage) => void;
};

/**
 * Typed error raised by `loadTimetable`. `stage` identifies which step failed,
 * so the UI can render a precise fault message without inspecting `cause`.
 */
export class TimetableLoadError extends Error {
  readonly stage: LoadStage;
  override readonly cause: unknown;

  constructor(stage: LoadStage, message: string, cause?: unknown) {
    super(message);
    this.name = 'TimetableLoadError';
    this.stage = stage;
    this.cause = cause;
  }
}

/**
 * Load the timetable bundle: fetch the manifest, fetch the stops index and every
 * listed day-file in parallel, deserialize them, and build a router per day.
 *
 * @throws {TimetableLoadError} on network failure, non-2xx response, decode
 *   failure, or router construction failure. `error.stage` reports the step.
 */
export async function loadTimetable(opts: LoadOptions = {}): Promise<TimetableBundle> {
  const manifestUrl = resolveUrl(opts.manifestUrl ?? envManifestUrl() ?? DEFAULT_MANIFEST_URL);
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  const { signal, onStage } = opts;

  onStage?.('fetch');
  const manifest = await fetchManifest(fetchImpl, manifestUrl, signal);
  if (manifest.days.length === 0) {
    throw new TimetableLoadError('fetch', `Manifest ${manifestUrl} lists no service days`);
  }

  const stopsUrl = new URL(manifest.stopsPath, manifestUrl).toString();
  const dayTargets = manifest.days.map((day) => ({
    serviceDate: day.serviceDate,
    url: new URL(day.path, manifestUrl).toString(),
  }));

  const [stopsBytes, dayBuffers] = await Promise.all([
    fetchBuffer(fetchImpl, stopsUrl, signal),
    Promise.all(
      dayTargets.map(async (target) => ({
        ...target,
        bytes: await fetchBuffer(fetchImpl, target.url, signal),
      })),
    ),
  ]);

  onStage?.('deserialize');
  const stopsIndex = decode('deserialize', stopsUrl, () => StopsIndex.fromData(stopsBytes));
  const timetables = dayBuffers.map((day) => ({
    serviceDate: day.serviceDate,
    timetable: decode('deserialize', day.url, () => Timetable.fromData(day.bytes)),
  }));

  onStage?.('router');
  const days: ScheduleDay[] = timetables.map(({ serviceDate, timetable }) => {
    try {
      return { serviceDate, router: new Router(timetable, stopsIndex) };
    } catch (cause) {
      throw new TimetableLoadError(
        'router',
        `Failed to construct Router for service day ${serviceDate}`,
        cause,
      );
    }
  });

  return {
    stopsIndex,
    days,
    feedVersion: manifest.feedVersion,
    feedPublishedAt: manifest.feedPublishedAt,
  };
}

function envManifestUrl(): string | undefined {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_SCHEDULE_MANIFEST_URL;
}

/** Resolve a possibly-relative URL against the document origin (or a test base). */
function resolveUrl(url: string): string {
  const base =
    typeof globalThis.location !== 'undefined' ? globalThis.location.href : 'http://localhost/';
  return new URL(url, base).toString();
}

async function fetchManifest(
  fetchImpl: typeof globalThis.fetch,
  url: string,
  signal: AbortSignal | undefined,
): Promise<ScheduleManifest> {
  let response: Response;
  try {
    response = await fetchImpl(url, signal ? { signal } : undefined);
  } catch (cause) {
    throw new TimetableLoadError('fetch', `Network error loading manifest ${url}`, cause);
  }
  if (!response.ok) {
    throw new TimetableLoadError(
      'fetch',
      `Manifest ${url} returned HTTP ${response.status} ${response.statusText}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (cause) {
    throw new TimetableLoadError('fetch', `Failed to parse manifest ${url}`, cause);
  }
  if (!isManifest(parsed)) {
    throw new TimetableLoadError('fetch', `Manifest ${url} is malformed`);
  }
  return parsed;
}

function isManifest(value: unknown): value is ScheduleManifest {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.feedVersion === 'string' &&
    typeof m.feedPublishedAt === 'string' &&
    typeof m.stopsPath === 'string' &&
    Array.isArray(m.days) &&
    m.days.every(
      (d) =>
        typeof d === 'object' &&
        d !== null &&
        typeof (d as Record<string, unknown>).serviceDate === 'string' &&
        typeof (d as Record<string, unknown>).path === 'string',
    )
  );
}

async function fetchBuffer(
  fetchImpl: typeof globalThis.fetch,
  url: string,
  signal: AbortSignal | undefined,
): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetchImpl(url, signal ? { signal } : undefined);
  } catch (cause) {
    throw new TimetableLoadError('fetch', `Network error loading ${url}`, cause);
  }
  if (!response.ok) {
    throw new TimetableLoadError(
      'fetch',
      `Asset ${url} returned HTTP ${response.status} ${response.statusText}`,
    );
  }
  try {
    const arrayBuf = await response.arrayBuffer();
    return new Uint8Array(arrayBuf);
  } catch (cause) {
    throw new TimetableLoadError('fetch', `Failed to read response body for ${url}`, cause);
  }
}

function decode<T>(stage: LoadStage, url: string, fn: () => T): T {
  try {
    return fn();
  } catch (cause) {
    throw new TimetableLoadError(stage, `Failed to decode ${url}`, cause);
  }
}
