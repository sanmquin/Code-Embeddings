/**
 * Scans the provided grid and identifies the first non-zero integer color value.
 * Useful for identifying the 'theme' or 'primary' color of an ARC grid task.
 * 
 * @param {number[][]} grid - A 2D array representing the task grid.
 * @returns {number} The first non-zero color found, or 0 if no colored cells exist.
 */
export function findPrimaryColor(grid: number[][]): number {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] !== 0) return grid[r][c];
    }
  }
  return 0;
}