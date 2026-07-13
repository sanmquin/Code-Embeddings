import { test, expect } from '@playwright/test';

test('reasoning tab loads, retrieves solution, and displays matrix transformation playback', async ({ page }) => {
  test.setTimeout(45000);

  // 1. Mock the ARC task JSON
  const mockTask = {
    train: [
      {
        input: [
          [1, 0],
          [0, 2]
        ],
        output: [
          [1, 3],
          [3, 2]
        ]
      }
    ],
    test: [
      {
        input: [
          [0, 0],
          [0, 0]
        ],
        output: [
          [3, 3],
          [3, 3]
        ]
      }
    ]
  };

  await page.route('**/dataset/tasks/00576224.json', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockTask)
  }));

  // 2. Mock the JS solution code from GitHub Matrix repo
  // The solution simply changes 0s in the grid to 3
  const mockSolution = `
    /**
     * Test solve
     */
    function solve(grid) {
      const out = grid.map(row => [...row]);
      for (let r = 0; r < out.length; r++) {
        for (let c = 0; c < out[r].length; c++) {
          if (out[r][c] === 0) {
            out[r][c] = 3;
          }
        }
      }
      return out;
    }
  `;

  await page.route('**/solutions/00576224.js', route => route.fulfill({
    status: 200,
    contentType: 'text/plain',
    body: mockSolution
  }));

  // 3. Navigate to the app
  await page.goto('http://localhost:5173');

  // Wait for page to load
  await expect(page.locator('.task-loader button')).toBeEnabled();

  // 4. Click the "Reasoning" tab
  const reasoningTabButton = page.locator('button', { hasText: 'Reasoning' });
  await expect(reasoningTabButton).toBeVisible();
  await reasoningTabButton.click();

  // 5. Verify the Reasoning Screen loads
  const heading = page.locator('h2', { hasText: 'Matrix Transformation Reasoning' });
  await expect(heading).toBeVisible();

  // 6. Select puzzle and click Load
  const inputSelector = page.locator('.puzzle-selector-container input');
  await expect(inputSelector).toBeVisible();
  await inputSelector.fill('00576224');

  const loadButton = page.locator('button', { hasText: 'Load Puzzle & Solution' });
  await expect(loadButton).toBeVisible();
  await loadButton.click();

  // 7. Verify task and solution are fetched and the playback panel appears
  const selectCaseHeader = page.locator('h3', { hasText: 'Select Training/Testing Case' });
  await expect(selectCaseHeader).toBeVisible();

  const caseButton = page.locator('button', { hasText: 'Train Case #0' });
  await expect(caseButton).toBeVisible();

  // Verify Playback controls appear
  const playbackHeader = page.locator('h4', { hasText: 'Playback Controls' });
  await expect(playbackHeader).toBeVisible();

  // Verify frame counter starts at Frame 1 / N (since the matrix changed)
  const frameCounter = page.locator('text=/Frame \\d+ \\/ \\d+/');
  await expect(frameCounter).toBeVisible();

  // Verify next, prev, first, last buttons exist
  const nextButton = page.locator('button', { hasText: 'Next' });
  const prevButton = page.locator('button', { hasText: 'Prev' });
  const playButton = page.locator('button', { hasText: 'Play' });

  await expect(nextButton).toBeVisible();
  await expect(prevButton).toBeVisible();
  await expect(playButton).toBeVisible();

  // The mockup solution has two mutations (two 0s changing to 3)
  // Let's click "Next" to step through the frames
  await nextButton.click();
  // Ensure the frame indicator increments
  await expect(page.locator('text=/Frame 2/')).toBeVisible();

  // Verify that the code viewer shows our mockSolution code
  const codeViewer = page.locator('pre', { hasText: 'function solve' });
  await expect(codeViewer).toBeVisible();
});
