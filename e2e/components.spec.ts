import { expect, test } from '@playwright/test';

test('renders the component library on the /components route', async ({ page }) => {
  await page.goto('/components');

  await expect(page.getByRole('heading', { name: 'COMPONENT LIBRARY' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'OPEN INCIDENT' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'REVOKE ACCESS' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('BREACH');
});
