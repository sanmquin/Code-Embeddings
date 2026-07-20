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

  test('supports selecting monochromatic and no-motif filters', async ({ page }) => {
    // Navigate to local dev server
    await page.goto('http://localhost:5173/');

    // Click the Clusters navigation tab
    await page.click('button:has-text("Clusters")');

    // Select the "monochromatic" filter
    await page.selectOption('#filters-dropdown', 'monochromatic');

    // Verify select filter changes
    await expect(page.locator('#filters-dropdown')).toHaveValue('monochromatic');

    // Verify filter statistics panel is rendered
    await expect(page.locator('text=Filtered Puzzles')).toBeVisible();
    await expect(page.locator('text=Avg Matching Pairs')).toBeVisible();
    await expect(page.locator('text=Total Grids')).toBeVisible();

    // Verify matching examples exist on screen
    await expect(page.locator('text=Meets Filter').first()).toBeVisible();

    // Select the "no_motif" filter
    await page.selectOption('#filters-dropdown', 'no_motif');

    // Verify select filter changes
    await expect(page.locator('#filters-dropdown')).toHaveValue('no_motif');

    // Verify filter statistics panel is rendered for no_motif (specialized headers)
    await expect(page.locator('text=Filtered Puzzles')).toBeVisible();
    await expect(page.locator('text=Avg Max Dimension').first()).toBeVisible();
    await expect(page.locator('text=Avg Unique Colors').first()).toBeVisible();
    await expect(page.locator('text=Avg Density').first()).toBeVisible();

    // Verify we see some specific card stats
    await expect(page.locator('text=Max Dimension:').first()).toBeVisible();
    await expect(page.locator('text=Unique Colors:').first()).toBeVisible();
    await expect(page.locator('text=Avg Density:').first()).toBeVisible();
  });
});
