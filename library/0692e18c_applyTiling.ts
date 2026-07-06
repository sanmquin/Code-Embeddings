/**
 * Tiles a matrix into a larger output grid. Each non-zero cell in the source grid
 * acts as a placeholder for the entire 'tile' pattern provided.
 * 
 * @param {number[][]} grid - The source grid determining where the tile is placed.
 * @param {number[][]} tile - The matrix pattern to stamp into the output grid.
 * @returns {number[][]} A scaled-up grid of size (gridSize * tileSize) x (gridSize * tileSize).
 */
export function applyTiling(grid: number[][], tile: number[][]): number[][] {
  const n: number = grid.length;
  const outSize: number = n * n;
  const out: number[][] = Array.from({ length: outSize }, () => Array(outSize).fill(0));

  for (let br = 0; br < n; br++) {
    for (let bc = 0; bc < n; bc++) {
      if (grid[br][bc] !== 0) {
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            out[br * n + r][bc * n + c] = tile[r][c];
          }
        }
      }
    }
  }
  return out;
}