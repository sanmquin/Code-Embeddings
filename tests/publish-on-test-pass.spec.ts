import { test, expect } from '@playwright/test';

test('enables publication when test cases pass but training cases fail', async ({ page }) => {
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

  // 3. Set the refactored JavaScript code in localStorage
  await page.addInitScript(({ id }) => {
    const code = `
      function solve(grid, training) {
        if (JSON.stringify(grid) === '[[2]]') {
          return [[3]];
        }
        return [[0]];
      }
    `;
    localStorage.setItem('arc_solutions', JSON.stringify({
      [id]: code
    }));
  }, { id: taskId });

  // 4. Navigate to the app
  await page.goto('http://localhost:5173');

  // Wait for initial load to finish and button to be enabled
  await expect(page.locator('.task-loader button')).toBeEnabled();

  // 5. Navigate to the Execute & Verify screen
  const executeTabButton = page.locator('nav button').getByText('2. Execute & Verify');
  await expect(executeTabButton).toBeVisible();
  await executeTabButton.click();

  // 6. Click on Run Tests button
  const runTestsButton = page.locator('button').getByText('Run Tests');
  await expect(runTestsButton).toBeVisible();
  await runTestsButton.click();

  // 7. Verify results table shows FAIL for train and PASS for test
  const resultsTable = page.locator('.execution-screen table');
  await expect(resultsTable).toBeVisible();

  const trainRow = resultsTable.locator('tbody tr').filter({ hasText: 'train' });
  await expect(trainRow.locator('td').nth(4)).toHaveText('FAIL');

  const testRow = resultsTable.locator('tbody tr').filter({ hasText: 'test' });
  await expect(testRow.locator('td').nth(4)).toHaveText('PASS');

  // 8. Verify "3. Publish to GitHub" button is enabled
  const publishTabButton = page.locator('nav button').getByText('3. Publish to GitHub');
  await expect(publishTabButton).not.toBeDisabled();

  // 9. Click "3. Publish to GitHub" button
  await publishTabButton.click();

  // 10. Verify we are on the Publish screen
  await expect(page.locator('.publish-screen')).toBeVisible();
  await expect(page.locator('.publish-screen h3')).toHaveText('3. Publish to GitHub');
});
