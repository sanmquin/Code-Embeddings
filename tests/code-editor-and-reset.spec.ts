import { test, expect } from '@playwright/test';

test('supports direct editing and resetting of code solutions', async ({ page }) => {
  test.setTimeout(60000);

  const taskId = '00576224';

  // 1. Mock the ARC JSON data
  await page.route(`**/dataset/tasks/${taskId}.json`, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        train: [
          {
            input: [[0]],
            output: [[1]]
          }
        ],
        test: [
          {
            input: [[2]],
            output: [[3]]
          }
        ]
      })
    });
  });

  // 2. Mock the ARC Python solution
  await page.route(`**/solves/${taskId}/solver.py`, route => {
    route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: '# Mock Python Solution'
    });
  });

  // 3. Navigate to the app
  await page.goto('http://localhost:5173');

  // Wait for initial load to finish and button to be enabled
  await expect(page.locator('.task-loader button')).toBeEnabled();

  // 4. Locate the Refactored JavaScript Code editor textarea
  const textarea = page.getByPlaceholder("Write your JavaScript/TypeScript solution here, or click 'Refactor' to let the LLM generate one...");
  await expect(textarea).toBeVisible();

  // Initially it should be empty since there is no refactored code in localStorage
  await expect(textarea).toHaveValue('');

  // 5. Type some code into the direct editor
  await textarea.focus();
  await textarea.fill('function solve(grid, training) { return grid; }');

  // Verify the text was updated
  await expect(textarea).toHaveValue('function solve(grid, training) { return grid; }');

  // Ensure "Execute & Verify" tab is now enabled
  const executeTabButton = page.locator('nav button').getByText('2. Execute & Verify');
  await expect(executeTabButton).not.toBeDisabled();

  // 6. Handle the confirmation dialog for the reset
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('Are you sure you want to reset this solution');
    await dialog.accept();
  });

  // 7. Click on the Reset Solution button
  const resetButton = page.locator('button').getByText('Reset Solution');
  await expect(resetButton).toBeVisible();
  await resetButton.click();

  // 8. Verify the code has been cleared
  await expect(textarea).toHaveValue('');

  // Verify "Execute & Verify" tab is now disabled because code is empty
  await expect(executeTabButton).toBeDisabled();
});
