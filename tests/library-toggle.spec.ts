import { test, expect } from '@playwright/test';

test('library view supports toggling between individual functions and full solutions', async ({ page }) => {
  test.setTimeout(60000);

  // 1. Navigate to the app
  await page.goto('http://localhost:5173');

  // 2. Click on the "Library" navigation button
  const libraryTabButton = page.locator('.main-nav button').getByText('Library');
  await expect(libraryTabButton).toBeVisible();
  await libraryTabButton.click();

  // 3. Verify we are on the Library view (should show "Matrix Function Library" initially)
  const header = page.locator('h2');
  await expect(header).toHaveText('Matrix Function Library');

  // 4. Toggle buttons should be present
  const functionsToggle = page.getByRole('button', { name: 'Individual Functions' });
  const solutionsToggle = page.getByRole('button', { name: 'Full Solutions' });

  await expect(functionsToggle).toBeVisible();
  await expect(solutionsToggle).toBeVisible();

  // "Individual Functions" should be active by default
  await expect(functionsToggle).toHaveClass(/active/);
  await expect(solutionsToggle).not.toHaveClass(/active/);

  // 5. Toggle to "Full Solutions"
  await solutionsToggle.click();

  // Header should update to "Matrix Puzzle Solutions"
  await expect(header).toHaveText('Matrix Puzzle Solutions');
  await expect(solutionsToggle).toHaveClass(/active/);
  await expect(functionsToggle).not.toHaveClass(/active/);

  // 6. Toggle back to "Individual Functions"
  await functionsToggle.click();
  await expect(header).toHaveText('Matrix Function Library');
  await expect(functionsToggle).toHaveClass(/active/);
});
