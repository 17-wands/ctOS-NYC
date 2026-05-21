import { test, expect } from '@playwright/test';

test.describe('Responsive Layout', () => {
  test('mobile viewport shows bottom sheet layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');

    await expect(page.getByText('BOOT COMPLETE')).toBeVisible({ timeout: 10000 });

    // Verify query panel visible on mobile
    await expect(page.getByText('ORIGIN STATION')).toBeVisible();

    // Plan a trip
    await page.fill('input[placeholder*="origin"]', '14 St');
    await page.fill('input[placeholder*="destination"]', 'Times Sq');
    await page.click('button:has-text("EXECUTE QUERY")');

    // Wait for results
    await expect(page.getByText('DURATION')).toBeVisible({ timeout: 5000 });

    // Verify bottom sheet is visible
    const bottomSheet = page.locator('[role="region"][aria-label="Route results"]');
    await expect(bottomSheet).toBeVisible();

    // Bottom sheet should be expanded (data-expanded="true")
    await expect(bottomSheet).toHaveAttribute('data-expanded', 'true');

    // Test collapse/expand toggle
    const handle = page.locator('button[aria-label*="Collapse"]');
    await handle.click();
    await expect(bottomSheet).toHaveAttribute('data-expanded', 'false');

    await page.locator('button[aria-label*="Expand"]').click();
    await expect(bottomSheet).toHaveAttribute('data-expanded', 'true');
  });

  test('desktop viewport shows sidebar layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:3000');

    await expect(page.getByText('BOOT COMPLETE')).toBeVisible({ timeout: 10000 });

    // Verify sidebar region exists and is visible
    const sidebar = page.locator('.sidebar-region');
    await expect(sidebar).toBeVisible();

    // Verify query panel is in sidebar
    await expect(sidebar.locator('text=ORIGIN STATION')).toBeVisible();

    // Plan a trip
    await page.fill('input[placeholder*="origin"]', '14 St');
    await page.fill('input[placeholder*="destination"]', 'Times Sq');
    await page.click('button:has-text("EXECUTE QUERY")');

    // Wait for results
    await expect(page.getByText('DURATION')).toBeVisible({ timeout: 5000 });

    // Verify results appear in sidebar
    await expect(sidebar.locator('text=DURATION')).toBeVisible();

    // Verify bottom sheet is NOT visible on desktop
    const bottomSheet = page.locator('[role="region"][aria-label="Route results"]');
    await expect(bottomSheet).toBeHidden();

    // Verify map region exists
    const mapRegion = page.locator('.map-region');
    await expect(mapRegion).toBeVisible();
  });

  test('respects prefers-reduced-motion', async ({ page }) => {
    // Enable reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');

    await expect(page.getByText('BOOT COMPLETE')).toBeVisible({ timeout: 10000 });

    // Plan a trip to trigger bottom sheet
    await page.fill('input[placeholder*="origin"]', '14 St');
    await page.fill('input[placeholder*="destination"]', 'Times Sq');
    await page.click('button:has-text("EXECUTE QUERY")');

    await expect(page.getByText('DURATION')).toBeVisible({ timeout: 5000 });

    const bottomSheet = page.locator('[role="region"][aria-label="Route results"]');

    // Check that animation/transition duration is minimal (0.01ms from motion.css)
    const transitionDuration = await bottomSheet.evaluate((el) => {
      return window.getComputedStyle(el).transitionDuration;
    });

    // Should be 0.01ms or 0s (instant)
    expect(parseFloat(transitionDuration)).toBeLessThan(0.02);
  });

  test('mobile layout switches to desktop on resize', async ({ page }) => {
    // Start at mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');

    await expect(page.getByText('BOOT COMPLETE')).toBeVisible({ timeout: 10000 });

    // Plan trip at mobile size
    await page.fill('input[placeholder*="origin"]', '14 St');
    await page.fill('input[placeholder*="destination"]', 'Times Sq');
    await page.click('button:has-text("EXECUTE QUERY")');

    await expect(page.getByText('DURATION')).toBeVisible({ timeout: 5000 });

    // Verify bottom sheet visible
    const bottomSheet = page.locator('[role="region"][aria-label="Route results"]');
    await expect(bottomSheet).toBeVisible();

    // Resize to desktop
    await page.setViewportSize({ width: 1280, height: 800 });

    // Bottom sheet should be hidden
    await expect(bottomSheet).toBeHidden();

    // Sidebar should be visible
    const sidebar = page.locator('.sidebar-region');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('text=DURATION')).toBeVisible();
  });
});
