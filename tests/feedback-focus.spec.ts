import { test, expect } from '@playwright/test';

test('feedback textarea maintains focus while typing', async ({ page }) => {
  // Increase timeout for slow CI environments
  test.setTimeout(60000);

  // Navigate to the app
  await page.goto('http://localhost:5173');

  // Wait for loading to finish first to prevent race condition resetting feedback
  await expect(page.locator('.task-loader button')).toBeEnabled();

  // Wait for the app to load and the textarea to be visible
  const textarea = page.getByPlaceholder('Provide feedback to improve the refactored code...');
  await expect(textarea).toBeVisible();

  // Type into the textarea
  await textarea.focus();
  await textarea.type('Stable Focus Test');

  // Verify the content
  await expect(textarea).toHaveValue('Stable Focus Test');

  // Verify it still has focus (or at least didn't blur unexpectedly)
  // In a real bug scenario, it would lose focus after the first character
  // and subsequent characters would not be typed or would be typed elsewhere.
  await expect(textarea).toBeFocused();
});
