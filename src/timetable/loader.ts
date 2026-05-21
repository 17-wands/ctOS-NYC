/**
 * Timetable loader.
 *
 * Fetches the serialized GTFS assets (`timetable.pb`, `stops.pb`) produced by
 * `scripts/build-timetable.ts`, deserializes them into minotor structures, and
 * constructs a `Router`. The returned bundle lives for the session.
 *
 * Reference: ARCHITECTURE.md §4 (data model), §6 (pipeline).
 */

import { Router, StopsIndex, Timetable } from 'minotor';

/** Default URL for the timetable protobuf asset (Vite serves `public/` at `/`). */
export const DEFAULT_TIMETABLE_URL = '/timetable.pb';

/** Default URL for the stops index protobuf asset. */
export const DEFAULT_STOPS_URL = '/stops.pb';

/**
 * Stages of the load pipeline, in order. The boot UI subscribes via `onStage`
 * and renders each as a segmented progress step.
 */
export const LOAD_STAGES = ['fetch', 'deserialize', 'router'] as const;

export type LoadStage = (typeof LOAD_STAGES)[number];

/** In-memory transit bundle ready for routing queries. */
export type TimetableBundle = {
  timetable: Timetable;
  stopsIndex: StopsIndex;
  router: Router;
};

export type LoadOptions = {
  /** URL for the timetable protobuf. Defaults to `/timetable.pb`. */
  timetableUrl?: string;
  /** URL for the stops index protobuf. Defaults to `/stops.pb`. */
  stopsUrl?: string;
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
  // Re-declared so callers don't need `unknown`-handling for the standard
  // ES2022 `Error.cause` field.
  override readonly cause: unknown;

  constructor(stage: LoadStage, message: string, cause?: unknown) {
    super(message);
    this.name = 'TimetableLoadError';
    this.stage = stage;
    this.cause = cause;
  }
}

/**
 * Load the timetable bundle: fetch both assets in parallel, deserialize, and
 * construct the router. Each stage is announced via `onStage` before it runs.
 *
 * @throws {TimetableLoadError} on network failure, non-2xx response, decode
 *   failure, or router construction failure. `error.stage` reports the step.
 */
export async function loadTimetable(opts: LoadOptions = {}): Promise<TimetableBundle> {
  const timetableUrl = opts.timetableUrl ?? DEFAULT_TIMETABLE_URL;
  const stopsUrl = opts.stopsUrl ?? DEFAULT_STOPS_URL;
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  const { signal, onStage } = opts;

  onStage?.('fetch');
  const [timetableBytes, stopsBytes] = await Promise.all([
    fetchBuffer(fetchImpl, timetableUrl, signal),
    fetchBuffer(fetchImpl, stopsUrl, signal),
  ]);

  onStage?.('deserialize');
  const timetable = decode('deserialize', timetableUrl, () => Timetable.fromData(timetableBytes));
  const stopsIndex = decode('deserialize', stopsUrl, () => StopsIndex.fromData(stopsBytes));

  onStage?.('router');
  let router: Router;
  try {
    router = new Router(timetable, stopsIndex);
  } catch (cause) {
    throw new TimetableLoadError(
      'router',
      'Failed to construct Router from timetable bundle',
      cause,
    );
  }

  return { timetable, stopsIndex, router };
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
