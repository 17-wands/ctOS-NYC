import { expect, test } from '@playwright/test';

test('loads the ctOS NYC header on an obsidian background', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('banner')).toContainText('ctOS');

  const backgroundColor = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );

  expect(backgroundColor).toBe('rgb(5, 6, 8)');
});
