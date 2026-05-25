import { type Locator, type Page } from '@playwright/test';
import { buildScheduleAssets } from '../../scripts/build-timetable';
import { FIXTURE_ZIP } from '../../tests/helpers/fixtures';

/**
 * e2e harness for the trimmed `gtfs-mini` feed.
 *
 * The fixture is the southbound 1 line with a single ~08:00 weekday trip:
 *   Times Sq-42 St → 34 St-Penn → 14 St → Houston St → Franklin St.
 *
 * We build the schedule window in memory, serve it (manifest + per-day `.pb` +
 * stops) via `page.route`, mock `/api/realtime`, abort the real tile server, and
 * pin the clock so the default "now" lands inside the trip window. No network,
 * deterministic regardless of the day the suite runs.
 */

export const SERVICE_DATES = ['2026-05-20', '2026-05-21', '2026-05-22'];

/**
 * 07:55 America/New_York (EDT) on the first service day. The clock is pinned here
 * so the query's default "now" rounds up to 08:00 — the fixture's only trip — and
 * never trips the app's "time can't be in the past" validation.
 */
export const PINNED_NOW = new Date('2026-05-20T11:55:00Z');

export type RealtimeBody = {
  generatedAt: string;
  alerts: unknown[];
  tripDelays: unknown[];
  accessibilityOutages: unknown[];
};

export function emptyRealtime(): RealtimeBody {
  return {
    generatedAt: PINNED_NOW.toISOString(),
    alerts: [],
    tripDelays: [],
    accessibilityOutages: [],
  };
}

type Assets = { manifest: string; stops: Buffer; stopsName: string; days: Map<string, Buffer> };
let assetsPromise: Promise<Assets> | null = null;

function buildAssets(): Promise<Assets> {
  assetsPromise ??= (async () => {
    const built = await buildScheduleAssets({
      source: FIXTURE_ZIP,
      dates: SERVICE_DATES.map((serviceDate) => ({
        serviceDate,
        date: new Date(`${serviceDate}T12:00:00Z`),
      })),
    });
    const iso = PINNED_NOW.toISOString();
    const stopsName = `stops-${built.feedVersion}.pb`;
    const manifest = JSON.stringify({
      version: 1,
      feedVersion: built.feedVersion,
      feedPublishedAt: iso,
      stopsPath: stopsName,
      days: built.days.map((d) => ({
        serviceDate: d.serviceDate,
        path: `timetable-${d.serviceDate}.pb`,
        publishedAt: iso,
      })),
    });
    const days = new Map(
      built.days.map((d) => [`timetable-${d.serviceDate}.pb`, Buffer.from(d.bytes)]),
    );
    return { manifest, stops: Buffer.from(built.stops), stopsName, days };
  })();
  return assetsPromise;
}

/** Install all route mocks and pin the clock. Call before `page.goto('/')`. */
export async function mockApp(page: Page, realtime: RealtimeBody = emptyRealtime()): Promise<void> {
  const assets = await buildAssets();
  // Pin "now" into the fixture's service window. setFixedTime fixes Date/now()
  // while leaving timers (the search debounce) running.
  await page.clock.setFixedTime(PINNED_NOW);

  await page.route('**/schedule/manifest.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: assets.manifest }),
  );
  await page.route('**/schedule/*.pb', (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    const body = name === assets.stopsName ? assets.stops : assets.days.get(name);
    return body
      ? route.fulfill({ contentType: 'application/octet-stream', body })
      : route.fulfill({ status: 404 });
  });
  await page.route('**/api/realtime', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(realtime) }),
  );
  await page.route(/tiles\.openfreemap\.org/, (route) => route.abort());
}

/**
 * The visible query+results column. Both the mobile (`query-region`) and desktop
 * (`sidebar-region`) layouts render to the DOM; scope to the one for the active
 * viewport to avoid strict-mode duplicates (duplicate ids, "ROUTE QUERY", …).
 */
export function regionFor(page: Page, viewport: 'desktop' | 'mobile'): Locator {
  return page.locator(viewport === 'desktop' ? '.sidebar-region' : '.query-region');
}

/** Boot to the ready state and return the active region. */
export async function bootToReady(
  page: Page,
  viewport: 'desktop' | 'mobile' = 'desktop',
): Promise<Locator> {
  await page.goto('/');
  const region = regionFor(page, viewport);
  await region.getByText('ROUTE QUERY').waitFor({ state: 'visible', timeout: 30000 });
  return region;
}

/**
 * Fill origin + destination from the dropdowns and submit the query. Uses
 * placeholders rather than labels: both layouts render in the DOM with duplicate
 * `id`s, so `<label for>` association is ambiguous, but the placeholder matches
 * the input directly within the scoped region.
 */
export async function planTrip(
  region: Locator,
  origin: string,
  destination: string,
): Promise<void> {
  await region.getByPlaceholder('Search for origin station').fill(origin);
  await region.getByRole('option', { name: origin }).first().click();
  await region.getByPlaceholder('Search for destination station').fill(destination);
  await region.getByRole('option', { name: destination }).first().click();
  // The default departure time is the pinned "now" (07:55), which rounds to the
  // fixture's 08:00 trip — no need to set the datetime input.
  await region.getByRole('button', { name: 'EXECUTE QUERY' }).click();
}
