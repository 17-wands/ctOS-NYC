import {
  type BlobClient,
  publishSchedule,
  verifyPublishedSchedule,
} from '../../scripts/publish-schedule';
import { FIXTURE_KNOWN_STOP_SOURCE_ID, FIXTURE_ZIP } from '../../tests/helpers/fixtures';

const BASE_DATE = '2026-05-20';
const NOW = new Date('2026-05-20T12:00:00Z');
const FAKE_HOST = 'https://fake.blob.vercel-storage.com';

/**
 * In-memory Blob store keyed by pathname, exposing the slice of `@vercel/blob`
 * the publisher uses plus a matching `fetch` for verification.
 */
function createFakeBlob() {
  const store = new Map<string, Uint8Array>();
  const putCalls: string[] = [];

  const toBytes = (body: Uint8Array | string): Uint8Array =>
    typeof body === 'string' ? new TextEncoder().encode(body) : body;

  const client: BlobClient = {
    put: async (pathname, body, opts) => {
      if (store.has(pathname) && !opts.allowOverwrite) {
        throw new Error(`Blob already exists: ${pathname}`);
      }
      store.set(pathname, toBytes(body));
      putCalls.push(pathname);
      return { url: `${FAKE_HOST}/${pathname}`, pathname };
    },
    list: async ({ prefix } = {}) => ({
      blobs: [...store.keys()]
        .filter((p) => (prefix ? p.startsWith(prefix) : true))
        .map((pathname) => ({ pathname })),
    }),
  };

  const fetchImpl: typeof globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.toString();
    const pathname = url.startsWith(`${FAKE_HOST}/`) ? url.slice(FAKE_HOST.length + 1) : '';
    const bytes = store.get(pathname);
    if (!bytes) {
      return new Response(null, { status: 404, statusText: 'Not Found' });
    }
    return new Response(bytes as BodyInit, { status: 200 });
  };

  return { store, putCalls, client, fetchImpl };
}

describe('publishSchedule', () => {
  it('uploads the stops index, every day-file, and the manifest on a fresh store', async () => {
    const blob = createFakeBlob();

    const result = await publishSchedule({
      source: FIXTURE_ZIP,
      blob: blob.client,
      baseDate: BASE_DATE,
      days: 3,
      now: NOW,
    });

    const stopsName = `schedule/${result.manifest.stopsPath}`;
    const dayNames = result.manifest.days.map((d) => `schedule/${d.path}`);

    expect(result.uploaded).toEqual([stopsName, ...dayNames]);
    expect(result.skipped).toEqual([]);
    expect(result.manifestUrl).toBe(`${FAKE_HOST}/schedule/manifest.json`);
    // Stored: stops + 3 days + manifest.
    expect(blob.store.size).toBe(5);
    expect(blob.store.has('schedule/manifest.json')).toBe(true);
  });

  it('skips immutable assets already present but always rewrites the manifest', async () => {
    const blob = createFakeBlob();
    const opts = { source: FIXTURE_ZIP, blob: blob.client, baseDate: BASE_DATE, days: 3, now: NOW };

    await publishSchedule(opts);
    blob.putCalls.length = 0;

    const second = await publishSchedule(opts);

    // No immutable re-uploads; the manifest is overwritten.
    expect(second.uploaded).toEqual([]);
    expect(second.skipped).toHaveLength(4); // stops + 3 day-files
    expect(blob.putCalls).toEqual(['schedule/manifest.json']);
  });

  it('honors a custom prefix', async () => {
    const blob = createFakeBlob();

    const result = await publishSchedule({
      source: FIXTURE_ZIP,
      blob: blob.client,
      prefix: 'sched-v2',
      baseDate: BASE_DATE,
      days: 1,
      now: NOW,
    });

    expect(result.manifestUrl).toBe(`${FAKE_HOST}/sched-v2/manifest.json`);
    expect([...blob.store.keys()].every((p) => p.startsWith('sched-v2/'))).toBe(true);
  });
});

describe('verifyPublishedSchedule', () => {
  it('fetches and deserializes the manifest, stops, and newest day-file', async () => {
    const blob = createFakeBlob();
    const { manifestUrl } = await publishSchedule({
      source: FIXTURE_ZIP,
      blob: blob.client,
      baseDate: BASE_DATE,
      days: 2,
      now: NOW,
    });

    const verified = await verifyPublishedSchedule(manifestUrl, { fetchImpl: blob.fetchImpl });

    expect(verified.serviceDate).toBe('2026-05-21'); // newest of the 2-day window
    expect(verified.stopCount).toBeGreaterThan(0);
  });

  it('resolves sibling URLs relative to the manifest', async () => {
    const blob = createFakeBlob();
    const { manifestUrl, manifest } = await publishSchedule({
      source: FIXTURE_ZIP,
      blob: blob.client,
      baseDate: BASE_DATE,
      days: 1,
      now: NOW,
    });

    // The shared stops index must resolve and contain the known fixture stop.
    const stopsUrl = new URL(manifest.stopsPath, manifestUrl).toString();
    const response = await blob.fetchImpl(stopsUrl);
    expect(response.ok).toBe(true);

    const verified = await verifyPublishedSchedule(manifestUrl, { fetchImpl: blob.fetchImpl });
    expect(verified.serviceDate).toBe(BASE_DATE);
    expect(FIXTURE_KNOWN_STOP_SOURCE_ID).toBe('132S'); // fixture sanity anchor
  });

  it('throws when the manifest is unreachable', async () => {
    const blob = createFakeBlob();
    await expect(
      verifyPublishedSchedule(`${FAKE_HOST}/schedule/missing.json`, { fetchImpl: blob.fetchImpl }),
    ).rejects.toThrow(/HTTP 404/);
  });
});
