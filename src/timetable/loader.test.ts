import {
  FIXTURE_BASE_URL,
  FIXTURE_KNOWN_STOP_NAME,
  FIXTURE_KNOWN_STOP_SOURCE_ID,
  buildFixtureWindow,
  type FixtureWindow,
} from '../../tests/helpers/fixtures';
import { LOAD_STAGES, TimetableLoadError, loadTimetable, type LoadStage } from './loader';

describe('loadTimetable', () => {
  let window: FixtureWindow;

  beforeAll(async () => {
    window = await buildFixtureWindow();
  });

  it('returns a bundle with the stops index and one router per service day', async () => {
    const bundle = await loadTimetable({ manifestUrl: window.manifestUrl, fetch: window.fetch });

    expect(bundle.stopsIndex.size()).toBe(5);
    expect(bundle.days.map((d) => d.serviceDate)).toEqual(window.serviceDates);
    expect(bundle.days.every((d) => d.router)).toBe(true);
    expect(bundle.feedVersion).toBe(window.manifest.feedVersion);
    expect(bundle.feedPublishedAt).toBe(window.manifest.feedPublishedAt);
  });

  it('shares one stops index across day-routers and resolves a known stop', async () => {
    const { stopsIndex } = await loadTimetable({
      manifestUrl: window.manifestUrl,
      fetch: window.fetch,
    });
    expect(stopsIndex.findStopBySourceStopId(FIXTURE_KNOWN_STOP_SOURCE_ID)?.name).toBe(
      FIXTURE_KNOWN_STOP_NAME,
    );
  });

  it('fires onStage in pipeline order', async () => {
    const stages: LoadStage[] = [];
    await loadTimetable({
      manifestUrl: window.manifestUrl,
      fetch: window.fetch,
      onStage: (s) => stages.push(s),
    });
    expect(stages).toEqual([...LOAD_STAGES]);
  });

  it('resolves day/stops URLs relative to the manifest URL', async () => {
    const fetchSpy = vi.fn(window.fetch);
    await loadTimetable({ manifestUrl: window.manifestUrl, fetch: fetchSpy });

    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls).toContain(`${FIXTURE_BASE_URL}manifest.json`);
    expect(urls).toContain(`${FIXTURE_BASE_URL}${window.manifest.stopsPath}`);
    for (const day of window.manifest.days) {
      expect(urls).toContain(`${FIXTURE_BASE_URL}${day.path}`);
    }
  });

  it('throws stage=fetch when the manifest 404s', async () => {
    await expect(
      loadTimetable({ manifestUrl: `${FIXTURE_BASE_URL}missing.json`, fetch: window.fetch }),
    ).rejects.toMatchObject({ name: 'TimetableLoadError', stage: 'fetch' });
  });

  it('throws stage=fetch on a malformed manifest', async () => {
    const badFetch: typeof globalThis.fetch = async () =>
      new Response(JSON.stringify({ nope: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    await expect(
      loadTimetable({ manifestUrl: window.manifestUrl, fetch: badFetch }),
    ).rejects.toMatchObject({ stage: 'fetch', message: expect.stringContaining('malformed') });
  });

  it('throws stage=fetch when the network rejects', async () => {
    const cause = new Error('connection refused');
    const failing: typeof globalThis.fetch = async () => {
      throw cause;
    };
    const promise = loadTimetable({ manifestUrl: window.manifestUrl, fetch: failing });
    await expect(promise).rejects.toBeInstanceOf(TimetableLoadError);
    await expect(promise).rejects.toMatchObject({ stage: 'fetch', cause });
  });

  it('throws stage=deserialize when a day-file is corrupt', async () => {
    const garbage = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
    const corruptFetch: typeof globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.endsWith('manifest.json')) {
        return new Response(JSON.stringify(window.manifest), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(garbage as BodyInit, { status: 200 });
    };
    await expect(
      loadTimetable({ manifestUrl: window.manifestUrl, fetch: corruptFetch }),
    ).rejects.toMatchObject({ stage: 'deserialize' });
  });

  it('forwards the abort signal to fetch', async () => {
    const controller = new AbortController();
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal);
      return window.fetch(input, init);
    });
    await loadTimetable({
      manifestUrl: window.manifestUrl,
      fetch: fetchSpy as unknown as typeof globalThis.fetch,
      signal: controller.signal,
    });
    expect(fetchSpy).toHaveBeenCalled();
  });
});
