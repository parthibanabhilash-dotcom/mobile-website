import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('storefront browsing, search, wishlist, compare and persistent cart', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Extraordinary tech. Everyday possibilities.' }),
  ).toBeVisible();
  await page.getByLabel('Search products').fill('Pixel');
  await expect(
    page.locator('.search-suggestions').getByText('Pixel 9 Pro', { exact: true }),
  ).toBeVisible();
  await page.locator('.search-suggestions').getByText('Pixel 9 Pro', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pixel 9 Pro', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save to wishlist' }).click();
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await page.getByRole('button', { name: /Open cart, 1 items/ }).click();
  await expect(page.getByRole('dialog').getByText('Pixel 9 Pro', { exact: true })).toBeVisible();
  await page.getByLabel('Close dialog').click();
  await page.reload();
  await expect(page.getByRole('button', { name: /Open cart, 1 items/ })).toBeVisible();
  await page.goto('/wishlist');
  await expect(page.getByText('Pixel 9 Pro', { exact: true })).toBeVisible();
  await page.goto('/compare');
  await expect(page.locator('table').getByText('Pixel 9 Pro', { exact: true })).toBeVisible();
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Good to see you again.' })).toBeVisible();
});
for (const width of [360, 768, 1024, 1440])
  test(`responsive home ${width}px without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.hero')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
    if (width === 360) {
      await page.getByLabel('Open menu').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
    }
  });
test('keyboard focus and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Skip to content')).toBeFocused();
  expect(
    await page
      .locator('.button')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe('0s');
});
test('storefront has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/');
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''))).toEqual(
    [],
  );
});
test('catalog filters and invalid variants', async ({ page }) => {
  await page.goto('/shop?brand=Google');
  await expect(page.getByText('Pixel 9 Pro', { exact: true })).toBeVisible();
  await expect(page.getByText('iPhone 16 Pro', { exact: true })).not.toBeVisible();
  await page.goto('/products/iphone-16-pro');
  await page.getByRole('button', { name: 'Midnight', exact: true }).click();
  await expect(page.getByRole('button', { name: '12 GB', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: '512 GB', exact: true })).not.toBeVisible();
});

test('catalog page two stays selected after hydration', async ({ page }) => {
  await page.goto('/shop?page=2');
  await expect(page.locator('.product-grid .product-card')).toHaveCount(1);
  await page.waitForTimeout(750);
  await expect(page.locator('.product-grid .product-card')).toHaveCount(1);
});
