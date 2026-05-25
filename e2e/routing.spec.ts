import { expect, test } from '@playwright/test';
import { bootToReady, mockApp, planTrip } from './support/app';

test.describe('Trip planning', () => {
  test.beforeEach(async ({ page }) => {
    await mockApp(page);
  });

  test('completes a full trip planning flow', async ({ page }) => {
    const region = await bootToReady(page);
    await expect(page.getByText('ctOS')).toBeVisible();
    await planTrip(region, 'Times', 'Franklin');

    const firstItinerary = region.getByRole('button').filter({ hasText: 'DURATION' }).first();
    await expect(firstItinerary).toBeVisible({ timeout: 10000 });
    await firstItinerary.click();

    const itineraryPanel = region.getByRole('region', { name: 'ITINERARY' });
    await expect(itineraryPanel).toBeVisible();
    await expect(itineraryPanel).toContainText('DEPART');
    await expect(itineraryPanel).toContainText('ARRIVE');

    await expect(page.locator('[data-testid="map-container"]')).toBeVisible();
    await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 5000 });
  });

  test('shows no routes found when none exist', async ({ page }) => {
    const region = await bootToReady(page);
    // Franklin St is the southern terminus; nothing runs north back to Times Sq.
    await planTrip(region, 'Franklin', 'Times');

    await expect(region.getByText('NO ROUTES FOUND')).toBeVisible({ timeout: 10000 });
  });
});
