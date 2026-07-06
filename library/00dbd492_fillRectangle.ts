/**
 * Fills the interior of a rectangle within a 2D grid.
 * 
 * @param {number[][]} grid - The grid to modify in-place.
 * @param {number} minR - Start row index.
 * @param {number} maxR - End row index.
 * @param {number} minC - Start column index.
 * @param {number} maxC - End column index.
 * @param {number} color - The color value to fill with.
 * @returns {number[][]} The modified grid.
 */
export function fillRectangle(grid: number[][], minR: number, maxR: number, minC: number, maxC: number, color: number): number[][] {
  for (let r = minR + 1; r < maxR; r++) {
    for (let c = minC + 1; c < maxC; c++) {
      if (grid[r][c] === 0) grid[r][c] = color;
    }
  }
  return grid;
}