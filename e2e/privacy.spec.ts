import { expect, test } from '@playwright/test';
import { bootToReady, mockApp, planTrip } from './support/app';

// Origins the app is allowed to talk to. Same-origin (dev server) carries the
// app, the realtime proxy, and the schedule assets; tiles + blob are the only
// third parties, and both are in the CSP allowlist. Anything else would be a
// tracker/analytics regression.
const ALLOWED_HOST_SUFFIXES = [
  'localhost',
  'tiles.openfreemap.org',
  '.public.blob.vercel-storage.com',
];

test.describe('Privacy', () => {
  test('makes no requests to non-allowlisted (tracking) origins', async ({ page }) => {
    const offOrigin: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.protocol === 'data:' || url.protocol === 'blob:') return;
      const host = url.hostname;
      const ok = ALLOWED_HOST_SUFFIXES.some((s) => host === s || host.endsWith(s));
      if (!ok) offOrigin.push(request.url());
    });

    await mockApp(page);
    const region = await bootToReady(page);
    await planTrip(region, 'Times', 'Franklin');
    await region.getByRole('button').filter({ hasText: 'DURATION' }).first().click();

    expect(offOrigin).toEqual([]);
  });
});
