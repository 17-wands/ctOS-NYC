import { expect, test } from '@playwright/test';
import { bootToReady, mockApp, planTrip, regionFor } from './support/app';

const MOBILE = { width: 375, height: 667 };
const DESKTOP = { width: 1280, height: 800 };

test.describe('Responsive layout', () => {
  test.beforeEach(async ({ page }) => {
    await mockApp(page);
  });

  test('mobile viewport shows an expandable bottom sheet', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    const region = await bootToReady(page, 'mobile');
    await planTrip(region, 'Times', 'Franklin');

    const sheet = page.getByRole('region', { name: 'Route results' });
    await expect(sheet).toBeVisible({ timeout: 10000 });
    await expect(sheet).toHaveAttribute('data-expanded', 'true');

    await page.getByRole('button', { name: /Collapse results/ }).click();
    await expect(sheet).toHaveAttribute('data-expanded', 'false');

    await page.getByRole('button', { name: /Expand results/ }).click();
    await expect(sheet).toHaveAttribute('data-expanded', 'true');
  });

  test('desktop viewport shows the sidebar and hides the bottom sheet', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const region = await bootToReady(page, 'desktop');
    await planTrip(region, 'Times', 'Franklin');

    await expect(region.getByRole('button').filter({ hasText: 'DURATION' }).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('region', { name: 'Route results' })).toBeHidden();
    await expect(page.locator('.map-region')).toBeVisible();
  });

  test('respects prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(MOBILE);
    const region = await bootToReady(page, 'mobile');
    await planTrip(region, 'Times', 'Franklin');

    const sheet = page.getByRole('region', { name: 'Route results' });
    await expect(sheet).toBeVisible({ timeout: 10000 });

    const transition = await sheet.evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(parseFloat(transition)).toBeLessThan(0.02);
  });

  test('switches from bottom sheet to sidebar on resize', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    const region = await bootToReady(page, 'mobile');
    await planTrip(region, 'Times', 'Franklin');

    const sheet = page.getByRole('region', { name: 'Route results' });
    await expect(sheet).toBeVisible({ timeout: 10000 });

    await page.setViewportSize(DESKTOP);
    await expect(sheet).toBeHidden();
    await expect(regionFor(page, 'desktop').getByText('ROUTE QUERY')).toBeVisible();
  });
});
