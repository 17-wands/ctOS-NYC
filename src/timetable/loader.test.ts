import {
  FIXTURE_KNOWN_STOP_NAME,
  FIXTURE_KNOWN_STOP_SOURCE_ID,
  buildFixtureBuffers,
  makeBufferFetch,
  type FixtureBuffers,
} from '../../tests/helpers/fixtures';
import {
  DEFAULT_STOPS_URL,
  DEFAULT_TIMETABLE_URL,
  LOAD_STAGES,
  TimetableLoadError,
  loadTimetable,
  type LoadStage,
} from './loader';

describe('loadTimetable', () => {
  let buffers: FixtureBuffers;

  beforeAll(async () => {
    buffers = await buildFixtureBuffers();
  });

  afterAll(async () => {
    await buffers.cleanup();
  });

  it('returns a bundle with timetable, stops index, and router', async () => {
    const fetchStub = vi.fn(
      makeBufferFetch({
        [DEFAULT_TIMETABLE_URL]: buffers.timetable,
        [DEFAULT_STOPS_URL]: buffers.stops,
      }),
    );

    const bundle = await loadTimetable({ fetch: fetchStub });

    expect(bundle.timetable).toBeDefined();
    expect(bundle.stopsIndex).toBeDefined();
    expect(bundle.router).toBeDefined();
    expect(bundle.stopsIndex.size()).toBe(5);
  });

  it('resolves a known stop by source ID after load', async () => {
    const fetchStub = makeBufferFetch({
      [DEFAULT_TIMETABLE_URL]: buffers.timetable,
      [DEFAULT_STOPS_URL]: buffers.stops,
    });

    const { stopsIndex } = await loadTimetable({ fetch: fetchStub });
    const stop = stopsIndex.findStopBySourceStopId(FIXTURE_KNOWN_STOP_SOURCE_ID);

    expect(stop?.name).toBe(FIXTURE_KNOWN_STOP_NAME);
  });

  it('fires onStage in pipeline order before each stage runs', async () => {
    const fetchStub = makeBufferFetch({
      [DEFAULT_TIMETABLE_URL]: buffers.timetable,
      [DEFAULT_STOPS_URL]: buffers.stops,
    });
    const stages: LoadStage[] = [];

    await loadTimetable({ fetch: fetchStub, onStage: (s) => stages.push(s) });

    expect(stages).toEqual([...LOAD_STAGES]);
  });

  it('uses the default timetable and stops URLs when none are provided', async () => {
    const fetchStub = vi.fn(
      makeBufferFetch({
        [DEFAULT_TIMETABLE_URL]: buffers.timetable,
        [DEFAULT_STOPS_URL]: buffers.stops,
      }),
    );

    await loadTimetable({ fetch: fetchStub });

    const urls = fetchStub.mock.calls.map((call) => call[0]);
    expect(urls).toContain(DEFAULT_TIMETABLE_URL);
    expect(urls).toContain(DEFAULT_STOPS_URL);
  });

  it('honors custom timetable and stops URLs', async () => {
    const fetchStub = vi.fn(
      makeBufferFetch({
        '/custom/timetable.pb': buffers.timetable,
        '/custom/stops.pb': buffers.stops,
      }),
    );

    await loadTimetable({
      fetch: fetchStub,
      timetableUrl: '/custom/timetable.pb',
      stopsUrl: '/custom/stops.pb',
    });

    const urls = fetchStub.mock.calls.map((call) => call[0]);
    expect(urls).toContain('/custom/timetable.pb');
    expect(urls).toContain('/custom/stops.pb');
  });

  it('throws TimetableLoadError with stage=fetch on a 404 response', async () => {
    const fetchStub: typeof globalThis.fetch = async () =>
      new Response(null, { status: 404, statusText: 'Not Found' });

    await expect(loadTimetable({ fetch: fetchStub })).rejects.toMatchObject({
      name: 'TimetableLoadError',
      stage: 'fetch',
      message: expect.stringContaining('404'),
    });
  });

  it('throws TimetableLoadError with stage=fetch when the network rejects', async () => {
    const cause = new Error('connection refused');
    const fetchStub: typeof globalThis.fetch = async () => {
      throw cause;
    };

    const promise = loadTimetable({ fetch: fetchStub });

    await expect(promise).rejects.toBeInstanceOf(TimetableLoadError);
    await expect(promise).rejects.toMatchObject({ stage: 'fetch', cause });
  });

  it('throws TimetableLoadError with stage=deserialize on corrupt bytes', async () => {
    const garbage = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
    const fetchStub = makeBufferFetch({
      [DEFAULT_TIMETABLE_URL]: garbage,
      [DEFAULT_STOPS_URL]: garbage,
    });

    await expect(loadTimetable({ fetch: fetchStub })).rejects.toMatchObject({
      name: 'TimetableLoadError',
      stage: 'deserialize',
    });
  });

  it('forwards the abort signal to the fetch implementation', async () => {
    const controller = new AbortController();
    const fetchStub = vi.fn<typeof globalThis.fetch>(async (input, init) => {
      // Capture the signal that was actually passed to fetch.
      expect(init?.signal).toBe(controller.signal);
      const url = typeof input === 'string' ? input : input.toString();
      const body = url === DEFAULT_TIMETABLE_URL ? buffers.timetable : buffers.stops;
      // See note in tests/helpers/fixtures.ts on the `BodyInit` cast.
      return new Response(body as BodyInit, { status: 200 });
    });

    await loadTimetable({ fetch: fetchStub, signal: controller.signal });

    expect(fetchStub).toHaveBeenCalledTimes(2);
  });
});
