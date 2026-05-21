import { expect, test } from '@playwright/test';

test.describe('Trip planning', () => {
  test('completes a full trip planning flow', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('ctOS')).toBeVisible();

    await expect(page.getByText('BOOT SEQUENCE')).toBeVisible();

    await expect(page.getByText('ROUTE QUERY')).toBeVisible({ timeout: 30000 });

    const originInput = page.getByLabel('ORIGIN STATION');
    await originInput.fill('Union');
    await expect(page.getByText('14 St - Union Sq')).toBeVisible();
    await page.getByText('14 St - Union Sq').click();

    const destinationInput = page.getByLabel('DESTINATION STATION');
    await destinationInput.fill('Times');
    await expect(page.getByText('Times Sq-42 St')).toBeVisible();
    await page.getByText('Times Sq-42 St').click();

    const executeButton = page.getByRole('button', { name: 'EXECUTE QUERY' });
    await expect(executeButton).toBeEnabled();
    await executeButton.click();

    await expect(page.getByText('COMPUTING ROUTES...')).toBeVisible();

    await expect(page.getByRole('button').filter({ hasText: 'DURATION' })).toBeVisible({
      timeout: 10000,
    });

    const firstItinerary = page.getByRole('button').filter({ hasText: 'DURATION' }).first();
    await firstItinerary.click();

    await expect(page.getByText('ITINERARY')).toBeVisible();
    await expect(page.getByText('DEPART')).toBeVisible();
    await expect(page.getByText('ARRIVE')).toBeVisible();
  });

  test('shows no routes found when no routes exist', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('ROUTE QUERY')).toBeVisible({ timeout: 30000 });

    const originInput = page.getByLabel('ORIGIN STATION');
    await originInput.fill('Coney');
    await expect(page.getByText('Coney Island - Stillwell Av')).toBeVisible();
    await page.getByText('Coney Island - Stillwell Av').click();

    const destinationInput = page.getByLabel('DESTINATION STATION');
    await destinationInput.fill('Rockaway');
    await expect(page.getByText('Far Rockaway - Mott Av')).toBeVisible();
    await page.getByText('Far Rockaway - Mott Av').click();

    const executeButton = page.getByRole('button', { name: 'EXECUTE QUERY' });
    await executeButton.click();

    await expect(page.getByText('NO ROUTES FOUND')).toBeVisible({ timeout: 10000 });
  });
});
