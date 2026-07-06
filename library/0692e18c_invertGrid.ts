/**
 * Creates an inverted representation of the grid. Cells that contain color become 0 (empty),
 * while cells that were 0 become the provided fill color.
 * 
 * @param {number[][]} grid - The input square matrix to invert.
 * @param {number} color - The color used to fill previously empty cells.
 * @returns {number[][]} A new inverted square grid of the same dimensions.
 */
export function invertGrid(grid: number[][], color: number): number[][] {
  const n: number = grid.length;
  const inverted: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      inverted[r][c] = grid[r][c] !== 0 ? 0 : color;
    }
  }
  return inverted;
}