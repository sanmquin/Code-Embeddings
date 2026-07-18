import { test, expect } from '@playwright/test';

test.describe('Clusters tab filters', () => {
  test('supports selecting a filter and rendering matching puzzles', async ({ page }) => {
    // Navigate to local dev server
    await page.goto('http://localhost:5173/');

    // Click the Clusters navigation tab
    await page.click('button:has-text("Clusters")');

    // Wait for the Cluster selector or filter dropdown to appear
    await expect(page.locator('#filters-dropdown')).toBeVisible();

    // Verify default value is "none"
    await expect(page.locator('#filters-dropdown')).toHaveValue('none');

    // Select the "same shapes puzzle (color change)" filter
    await page.selectOption('#filters-dropdown', 'same_shapes');

    // Verify select filter changes
    await expect(page.locator('#filters-dropdown')).toHaveValue('same_shapes');

    // Verify filter statistics panel is rendered
    await expect(page.locator('text=Filtered Puzzles')).toBeVisible();
    await expect(page.locator('text=Avg Matching Pairs')).toBeVisible();
    await expect(page.locator('text=Total Grids')).toBeVisible();

    // Verify matching examples exist on screen
    await expect(page.locator('text=Meets Filter').first()).toBeVisible();
  });
});
