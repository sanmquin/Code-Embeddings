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

  // 5. Test search/filtering (starts-with exact match and RegExp)
  // Let's type "1ae" to filter the list (starts with 1ae)
  await selectorInput.fill('1ae');
  const listItems = page.locator('.puzzle-dropdown-item');
  await expect(listItems).toHaveCount(1);
  await expect(listItems.first()).toContainText('1ae2feb7');

  // Let's type "7" and verify it ONLY matches items STARTING with 7 (like 7b0280bc)
  // and does NOT match 1ae2feb7 which ends in 7
  await selectorInput.fill('7');
  const matchingSevenCount = await listItems.count();
  for (let i = 0; i < matchingSevenCount; i++) {
    const text = await listItems.nth(i).locator('.puzzle-id-text').innerText();
    expect(text.startsWith('7')).toBe(true);
  }

  // Let's type a custom RegExp like "^[1-2]" or just "[1-2]" which gets prepend with ^
  await selectorInput.fill('[1-2]a');
  // Should match "1ae2feb7" or "2ba387bc" etc. starting with 1 or 2 followed by a
  const regexMatchCount = await listItems.count();
  for (let i = 0; i < regexMatchCount; i++) {
    const text = await listItems.nth(i).locator('.puzzle-id-text').innerText();
    expect(/^[12]a/i.test(text)).toBe(true);
  }

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
