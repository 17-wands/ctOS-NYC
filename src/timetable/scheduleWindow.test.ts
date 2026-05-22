import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StopsIndex, Timetable } from 'minotor';
import {
  buildScheduleWindow,
  enumerateServiceDates,
  todayInTimeZone,
  type ScheduleManifest,
} from '../../scripts/build-schedule-window';
import { buildScheduleAssets } from '../../scripts/build-timetable';
import {
  FIXTURE_KNOWN_STOP_NAME,
  FIXTURE_KNOWN_STOP_SOURCE_ID,
  FIXTURE_ZIP,
} from '../../tests/helpers/fixtures';

// A weekday inside the fixture's WKD calendar range (Wed 2026-05-20).
const BASE_DATE = '2026-05-20';

describe('enumerateServiceDates', () => {
  it('returns N consecutive dates starting at the base date', () => {
    expect(enumerateServiceDates('2026-05-20', 3)).toEqual([
      '2026-05-20',
      '2026-05-21',
      '2026-05-22',
    ]);
  });

  it('handles month rollover', () => {
    expect(enumerateServiceDates('2026-05-30', 3)).toEqual([
      '2026-05-30',
      '2026-05-31',
      '2026-06-01',
    ]);
  });

  it('handles year rollover', () => {
    expect(enumerateServiceDates('2026-12-31', 2)).toEqual(['2026-12-31', '2027-01-01']);
  });

  it('rejects malformed dates', () => {
    expect(() => enumerateServiceDates('2026/05/20', 1)).toThrow(/YYYY-MM-DD/);
  });
});

describe('todayInTimeZone', () => {
  it('formats the date in the given zone as YYYY-MM-DD', () => {
    // 2026-05-21T02:00Z is still 2026-05-20 in America/New_York (22:00 EDT).
    const result = todayInTimeZone('America/New_York', new Date('2026-05-21T02:00:00Z'));
    expect(result).toBe('2026-05-20');
  });
});

describe('buildScheduleAssets', () => {
  it('produces a stable feedVersion across runs of the same feed', async () => {
    const a = await buildScheduleAssets({
      source: FIXTURE_ZIP,
      dates: [{ serviceDate: BASE_DATE, date: new Date(`${BASE_DATE}T12:00:00Z`) }],
    });
    const b = await buildScheduleAssets({
      source: FIXTURE_ZIP,
      dates: [{ serviceDate: BASE_DATE, date: new Date(`${BASE_DATE}T12:00:00Z`) }],
    });

    expect(a.feedVersion).toBe(b.feedVersion);
    expect(a.feedVersion).toMatch(/^[0-9a-f]{12}$/);
    expect(a.days).toHaveLength(1);
  });

  it('serializes one timetable per requested date sharing one stops buffer', async () => {
    const assets = await buildScheduleAssets({
      source: FIXTURE_ZIP,
      dates: [
        { serviceDate: '2026-05-20', date: new Date('2026-05-20T12:00:00Z') },
        { serviceDate: '2026-05-21', date: new Date('2026-05-21T12:00:00Z') },
      ],
    });

    expect(assets.days.map((d) => d.serviceDate)).toEqual(['2026-05-20', '2026-05-21']);
    expect(assets.stops.byteLength).toBeGreaterThan(0);
    for (const day of assets.days) {
      expect(day.bytes.byteLength).toBeGreaterThan(0);
    }
  });
});

describe('buildScheduleWindow', () => {
  let outDir: string;

  beforeEach(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'schedule-window-'));
  });

  afterEach(async () => {
    await rm(outDir, { recursive: true, force: true });
  });

  async function readManifest(dir: string): Promise<ScheduleManifest> {
    const raw = await readFile(join(dir, 'manifest.json'), 'utf8');
    return JSON.parse(raw) as ScheduleManifest;
  }

  it('writes a day-file per service date, a shared stops file, and a manifest', async () => {
    const { manifest } = await buildScheduleWindow({
      source: FIXTURE_ZIP,
      outDir,
      baseDate: BASE_DATE,
      days: 3,
      now: new Date('2026-05-20T12:00:00Z'),
    });

    expect(manifest.version).toBe(1);
    expect(manifest.feedVersion).toMatch(/^[0-9a-f]{12}$/);
    expect(manifest.stopsPath).toBe(`stops-${manifest.feedVersion}.pb`);
    expect(manifest.days.map((d) => d.serviceDate)).toEqual([
      '2026-05-20',
      '2026-05-21',
      '2026-05-22',
    ]);
    expect(manifest.days.map((d) => d.path)).toEqual([
      'timetable-2026-05-20.pb',
      'timetable-2026-05-21.pb',
      'timetable-2026-05-22.pb',
    ]);

    const onDisk = await readManifest(outDir);
    expect(onDisk).toEqual(manifest);
  });

  it('produces day-files that deserialize and resolve a known stop via the shared stops index', async () => {
    const { manifest } = await buildScheduleWindow({
      source: FIXTURE_ZIP,
      outDir,
      baseDate: BASE_DATE,
      days: 2,
      now: new Date('2026-05-20T12:00:00Z'),
    });

    const stopsBytes = new Uint8Array(await readFile(join(outDir, manifest.stopsPath)));
    const stopsIndex = StopsIndex.fromData(stopsBytes);
    expect(stopsIndex.findStopBySourceStopId(FIXTURE_KNOWN_STOP_SOURCE_ID)?.name).toBe(
      FIXTURE_KNOWN_STOP_NAME,
    );

    for (const day of manifest.days) {
      const bytes = new Uint8Array(await readFile(join(outDir, day.path)));
      // Throws if the buffer is not a valid serialized timetable.
      expect(Timetable.fromData(bytes)).toBeDefined();
    }
  });

  it('defaults the base date to today in the schedule timezone', async () => {
    const now = new Date('2026-05-20T16:00:00Z'); // 12:00 EDT on 2026-05-20
    const { manifest } = await buildScheduleWindow({
      source: FIXTURE_ZIP,
      outDir,
      days: 1,
      now,
    });

    expect(manifest.days[0]?.serviceDate).toBe('2026-05-20');
    expect(manifest.feedPublishedAt).toBe(now.toISOString());
  });
});
