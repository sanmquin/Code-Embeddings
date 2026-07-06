/**
 * Returns a sub-matrix of a specific size from the provided 2D grid.
 * 
 * @param {number[][]} grid - The source 2D matrix.
 * @param {number} rStart - The starting row index.
 * @param {number} cStart - The starting column index.
 * @param {number} h - The height of the tile.
 * @param {number} w - The width of the tile.
 * @returns {number[][]} The extracted sub-grid.
 */
export function extractTile(grid: number[][], rStart: number, cStart: number, h: number, w: number): number[][] {
  return grid.slice(rStart, rStart + h).map((row) => row.slice(cStart, cStart + w));
}