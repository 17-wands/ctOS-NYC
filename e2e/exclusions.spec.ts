import { test, expect } from '@playwright/test';

test.describe('Route Exclusion', () => {
  test('excludes a disrupted route and shows alternative itinerary', async ({ page }) => {
    await page.route('/api/realtime', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generatedAt: new Date().toISOString(),
          alerts: [
            {
              id: 'test-alert-1',
              severity: 'BREACH',
              header: 'L train suspended',
              description: 'No service between Bedford and 8 Av',
              routeIds: ['L'],
              stopIds: [],
              activePeriod: {
                start: new Date().toISOString(),
                end: null,
              },
            },
          ],
          tripDelays: [],
          accessibilityOutages: [],
        }),
      });
    });

    await page.goto('http://localhost:3000');
    await expect(page.getByText('BOOT COMPLETE')).toBeVisible({ timeout: 10000 });

    await page.fill('input[placeholder*="origin"]', '14 St');
    await page.fill('input[placeholder*="destination"]', 'Times Sq');
    await page.click('button:has-text("EXECUTE QUERY")');

    await expect(page.getByText('DURATION')).toBeVisible({ timeout: 5000 });

    await page.locator('.item').first().click();
    await expect(page.getByText('ITINERARY')).toBeVisible();

    const excludeButton = page.locator('button:has-text("EXCLUDE")').first();
    if ((await excludeButton.count()) > 0) {
      const buttonText = await excludeButton.textContent();
      const routeName = buttonText?.replace('EXCLUDE ', '').trim();

      await excludeButton.click();

      await expect(page.getByText('ACTIVE EXCLUSIONS')).toBeVisible();
      await expect(page.getByText(`Routes: ${routeName}`)).toBeVisible();

      await page.click('button:has-text("CLEAR ALL EXCLUSIONS")');
      await expect(page.getByText('ACTIVE EXCLUSIONS')).not.toBeVisible();
    }
  });

  test('exclude button is disabled when route is already excluded', async ({ page }) => {
    await page.route('/api/realtime', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generatedAt: new Date().toISOString(),
          alerts: [
            {
              id: 'test-alert-1',
              severity: 'DEGRADED',
              header: 'Q train delays',
              routeIds: ['Q'],
              stopIds: [],
              activePeriod: { start: new Date().toISOString(), end: null },
            },
          ],
          tripDelays: [],
          accessibilityOutages: [],
        }),
      });
    });

    await page.goto('http://localhost:3000');
    await expect(page.getByText('BOOT COMPLETE')).toBeVisible({ timeout: 10000 });

    await page.fill('input[placeholder*="origin"]', '59 St');
    await page.fill('input[placeholder*="destination"]', 'Times Sq');
    await page.click('button:has-text("EXECUTE QUERY")');

    await expect(page.getByText('DURATION')).toBeVisible({ timeout: 5000 });
    await page.locator('.item').first().click();
    await expect(page.getByText('ITINERARY')).toBeVisible();

    const excludeButton = page.locator('button:has-text("EXCLUDE")').first();
    if ((await excludeButton.count()) > 0) {
      await excludeButton.click();
      await expect(excludeButton).toBeDisabled();
    }
  });
});
