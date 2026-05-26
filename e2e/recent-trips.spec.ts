import { expect, test } from '@playwright/test';
import { bootToReady, mockApp, planTrip, regionFor } from './support/app';

test.describe('Recent trips (on-device)', () => {
  test('records a planned trip, persists it across reload, and re-applies it', async ({ page }) => {
    await mockApp(page);
    let region = await bootToReady(page);

    await planTrip(region, 'Times', 'Franklin');
    await expect(region.getByRole('button').filter({ hasText: 'DURATION' }).first()).toBeVisible({
      timeout: 10000,
    });

    // The trip is now listed under Recent.
    const recent = region.getByRole('region', { name: 'Recent trips' });
    await expect(recent).toBeVisible();
    await expect(recent.getByText(/Times Sq-42 St → Franklin St/)).toBeVisible();

    // Persisted in localStorage only (no network) — survives a reload.
    const stored = await page.evaluate(() => localStorage.getItem('ctos.recent-trips'));
    expect(stored).toContain('Franklin St');

    await page.reload();
    region = regionFor(page, 'desktop');
    await expect(region.getByText('ROUTE QUERY')).toBeVisible({ timeout: 30000 });

    const recentAfter = region.getByRole('region', { name: 'Recent trips' });
    const recentEntry = recentAfter.getByRole('button', { name: /Times Sq-42 St → Franklin St/ });
    await expect(recentEntry).toBeVisible();

    // Selecting it repopulates the form; executing yields results again.
    await recentEntry.click();
    await region.getByRole('button', { name: 'EXECUTE QUERY' }).click();
    await expect(region.getByRole('button').filter({ hasText: 'DURATION' }).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
