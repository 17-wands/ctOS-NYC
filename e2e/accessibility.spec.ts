import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { bootToReady, mockApp, planTrip } from './support/app';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function analyze(page: Parameters<typeof bootToReady>[0]) {
  return new AxeBuilder({ page }).withTags(WCAG).analyze();
}

test.describe('Accessibility (WCAG AA)', () => {
  test('query screen has no violations', async ({ page }) => {
    await mockApp(page);
    await bootToReady(page);
    const results = await analyze(page);
    expect(results.violations).toEqual([]);
  });

  test('results screen has no violations', async ({ page }) => {
    await mockApp(page);
    const region = await bootToReady(page);
    await planTrip(region, 'Times', 'Franklin');
    await region.getByRole('button').filter({ hasText: 'DURATION' }).first().click();
    // The map canvas is decorative and tested separately; exclude it from the scan.
    const results = await new AxeBuilder({ page })
      .withTags(WCAG)
      .exclude('[data-testid="map-container"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('component sandbox has no violations', async ({ page }) => {
    await page.goto('/components');
    await expect(page.getByRole('heading', { name: 'COMPONENT LIBRARY' })).toBeVisible();
    const results = await analyze(page);
    expect(results.violations).toEqual([]);
  });

  test('a trip can be planned using only the keyboard', async ({ page }) => {
    await mockApp(page);
    const region = await bootToReady(page);

    // Type, wait for the debounced dropdown, then pick the first suggestion
    // with the keyboard.
    await region.getByPlaceholder('Search for origin station').fill('Times');
    await region.getByRole('option', { name: 'Times' }).first().waitFor();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await region.getByPlaceholder('Search for destination station').fill('Franklin');
    await region.getByRole('option', { name: 'Franklin' }).first().waitFor();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Tab to EXECUTE QUERY and activate it.
    const execute = region.getByRole('button', { name: 'EXECUTE QUERY' });
    await execute.focus();
    await page.keyboard.press('Enter');

    await expect(region.getByRole('button').filter({ hasText: 'DURATION' }).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
