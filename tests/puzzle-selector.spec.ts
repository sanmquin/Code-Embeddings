import { test, expect } from '@playwright/test';

test('puzzle selector dropdown, search filtering, and status icons', async ({ page }) => {
  test.setTimeout(60000);

  // Intercept requests for 3e6067c3 to guarantee a loading failure
  await page.route('**/3e6067c3**', route => route.fulfill({
    status: 404,
    contentType: 'text/plain',
    body: 'Not Found'
  }));

  // 1. Set some initial localStorage solved items
  await page.addInitScript(() => {
    localStorage.setItem('arc_solutions', JSON.stringify({
      "1ae2feb7": "const solve = (grid, training) => { return grid; };",
      "3e6067c3": "const solve = (grid, training) => { return grid; };"
    }));
  });

  // 2. Navigate to the app
  await page.goto('http://localhost:5173');

  // Wait for initial load to finish
  await expect(page.locator('.task-loader button')).toBeEnabled();

  // 3. Verify puzzle selector input is visible
  const selectorInput = page.locator('.puzzle-selector-container input');
  await expect(selectorInput).toBeVisible();

  // 4. Focus input, clear it, and verify dropdown opens with all options
  await selectorInput.focus();
  await selectorInput.fill('');
  const dropdownList = page.locator('.puzzle-dropdown-list');
  await expect(dropdownList).toBeVisible();

  // Check that "1ae2feb7" is in the list and has a checkmark icon
  const item1 = page.locator('.puzzle-dropdown-item').filter({ hasText: '1ae2feb7' });
  await expect(item1).toBeVisible();
  const solvedIcon1 = item1.locator('.solved-icon');
  await expect(solvedIcon1).toBeVisible();
  await expect(solvedIcon1).toHaveText('✓');

  // Check that "16b78196" is in the list and does NOT have a checkmark icon
  const itemUnsolved = page.locator('.puzzle-dropdown-item').filter({ hasText: '16b78196' });
  await expect(itemUnsolved).toBeVisible();
  await expect(itemUnsolved.locator('.solved-icon')).not.toBeVisible();

  // 5. Test search/filtering (exact order)
  // Let's type "1ae" to filter the list
  await selectorInput.fill('1ae');
  // There should only be "1ae2feb7" matching
  const listItems = page.locator('.puzzle-dropdown-item');
  await expect(listItems).toHaveCount(1);
  await expect(listItems.first()).toContainText('1ae2feb7');

  // Clear input
  await selectorInput.fill('');
  const count = await listItems.count();
  expect(count).toBeGreaterThan(5);

  // 6. Test select option updates value and closes dropdown
  const firstItem = page.locator('.puzzle-dropdown-item').first();
  const firstId = await firstItem.locator('.puzzle-id-text').innerText();
  await firstItem.click();

  // Dropdown should be hidden
  await expect(dropdownList).not.toBeVisible();
  // Input value should be updated
  await expect(selectorInput).toHaveValue(firstId);

  // 7. Verify cross icon on failed loads
  // Let's select "3e6067c3".
  await selectorInput.focus();
  await selectorInput.fill('3e6067c3');
  const item3InList = page.locator('.puzzle-dropdown-item').filter({ hasText: '3e6067c3' });
  await expect(item3InList).toBeVisible();
  await item3InList.click();

  // Wait for loading to finish and error container to show up
  await expect(page.locator('.error-container')).toBeVisible();

  // Focus to open dropdown, check "3e6067c3" has a cross icon "✗"
  await selectorInput.focus();
  await selectorInput.fill(''); // clear to see all
  const item3 = page.locator('.puzzle-dropdown-item').filter({ hasText: '3e6067c3' });
  await expect(item3).toBeVisible();
  const failedIcon = item3.locator('.failed-icon');
  await expect(failedIcon).toBeVisible();
  await expect(failedIcon).toHaveText('✗');
});
