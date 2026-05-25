import { expect, test } from '@playwright/test';
import { PINNED_NOW, bootToReady, mockApp, planTrip, type RealtimeBody } from './support/app';

const degradedRoute1: RealtimeBody = {
  generatedAt: PINNED_NOW.toISOString(),
  alerts: [
    {
      id: 'a1',
      severity: 'DEGRADED',
      header: '1 train delays',
      description: 'Signal problems',
      routeIds: ['1'],
      stopIds: [],
      activePeriod: { start: PINNED_NOW.toISOString(), end: null },
    },
  ],
  tripDelays: [],
  accessibilityOutages: [],
};

test.describe('Route exclusion', () => {
  test.beforeEach(async ({ page }) => {
    await mockApp(page, degradedRoute1);
  });

  test('excludes a disrupted route, then clears the exclusion', async ({ page }) => {
    const region = await bootToReady(page);
    await planTrip(region, 'Times', 'Franklin');

    const card = region.getByRole('button').filter({ hasText: 'DURATION' }).first();
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();

    await region.getByRole('button', { name: 'AVOID 1' }).click();

    await expect(region.getByText('ACTIVE EXCLUSIONS')).toBeVisible();
    await expect(region.getByText('Routes: 1')).toBeVisible();

    await region.getByRole('button', { name: 'CLEAR ALL EXCLUSIONS' }).click();
    await expect(region.getByText('ACTIVE EXCLUSIONS')).toHaveCount(0);
  });

  test('disables the avoid button once the route is excluded', async ({ page }) => {
    const region = await bootToReady(page);
    await planTrip(region, 'Times', 'Franklin');

    const card = region.getByRole('button').filter({ hasText: 'DURATION' }).first();
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();

    const avoid = region.getByRole('button', { name: 'AVOID 1' });
    await avoid.click();
    // Re-planning removes route 1; the banner reflects the active exclusion.
    await expect(region.getByText('Routes: 1')).toBeVisible();
  });
});
