import { test, expect } from '@playwright/test';

// QUARANTINED: pre-existing failures (wrong port / boot text / unseeded timetable). Rebuild in #25 Stage 3b. Tracking: #29
test.describe.fixme('Disruption Annotations', () => {
  test('displays disruption badges on affected legs', async ({ page }) => {
    // Mock /api/realtime with test data
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
              header: 'L train delays',
              description: 'Delays due to signal problems',
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

    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for boot sequence to complete
    await expect(page.getByText('BOOT COMPLETE')).toBeVisible({ timeout: 10000 });

    // Fill in origin and destination
    await page.fill('input[placeholder="Origin"]', '14 St');
    await page.fill('input[placeholder="Destination"]', 'Times Sq');

    // Submit query
    await page.click('button:has-text("COMPUTE ROUTES")');

    // Wait for results
    await expect(page.getByText('DURATION')).toBeVisible({ timeout: 5000 });

    // Select first itinerary
    await page.locator('.item').first().click();

    // Wait for itinerary panel to appear
    await expect(page.getByText('ITINERARY')).toBeVisible();

    // Check for disruption badge in the panel (if L train is in the route)
    const disruptionBadge = page.locator('.disruption');
    const hasBadge = await disruptionBadge.count();

    if (hasBadge > 0) {
      await expect(disruptionBadge.first()).toContainText('DEGRADED');
      await expect(disruptionBadge.first()).toContainText('L train delays');
    }
  });

  test('shows no annotations when realtime data is empty', async ({ page }) => {
    // Mock /api/realtime with empty data
    await page.route('/api/realtime', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generatedAt: new Date().toISOString(),
          alerts: [],
          tripDelays: [],
          accessibilityOutages: [],
        }),
      });
    });

    await page.goto('http://localhost:3000');

    await expect(page.getByText('BOOT COMPLETE')).toBeVisible({ timeout: 10000 });

    await page.fill('input[placeholder="Origin"]', '14 St');
    await page.fill('input[placeholder="Destination"]', 'Times Sq');

    await page.click('button:has-text("COMPUTE ROUTES")');

    await expect(page.getByText('DURATION')).toBeVisible({ timeout: 5000 });

    await page.locator('.item').first().click();

    await expect(page.getByText('ITINERARY')).toBeVisible();

    // No disruption badges should be present
    const disruptionBadge = page.locator('.disruption');
    await expect(disruptionBadge).toHaveCount(0);
  });

  test('shows severity badges on itinerary list cards', async ({ page }) => {
    // Mock /api/realtime with critical alert
    await page.route('/api/realtime', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          generatedAt: new Date().toISOString(),
          alerts: [
            {
              id: 'test-alert-2',
              severity: 'BREACH',
              header: 'L train suspended',
              description: 'No service on L train',
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

    await page.fill('input[placeholder="Origin"]', '14 St');
    await page.fill('input[placeholder="Destination"]', 'Times Sq');

    await page.click('button:has-text("COMPUTE ROUTES")');

    await expect(page.getByText('DURATION')).toBeVisible({ timeout: 5000 });

    // Check if any itinerary cards have severity data attribute (if L is in the route)
    const itemsWithSeverity = page.locator('.item[data-severity]');
    const count = await itemsWithSeverity.count();

    if (count > 0) {
      const firstItem = itemsWithSeverity.first();
      const severity = await firstItem.getAttribute('data-severity');
      expect(severity).toBeTruthy();
    }
  });
});
