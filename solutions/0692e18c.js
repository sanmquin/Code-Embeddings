/**
 * Finds the first non-zero color in the grid.
 * @param {number[][]} grid
 * @returns {number}
 */
function findPrimaryColor(grid) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] !== 0) return grid[r][c];
    }
  }
  return 0;
}

/**
 * Creates an inverted version of the grid, where 0s become the primary color
 * and non-zero values become 0.
 * @param {number[][]} grid
 * @param {number} color
 * @returns {number[][]}
 */
function invertGrid(grid, color) {
  const n = grid.length;
  const inverted = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      inverted[r][c] = grid[r][c] !== 0 ? 0 : color;
    }
  }
  return inverted;
}

/**
 * Tiles a matrix into a larger grid based on the input grid's structure.
 * @param {number[][]} grid
 * @param {number[][]} tile
 * @returns {number[][]}
 */
function applyTiling(grid, tile) {
  const n = grid.length;
  const outSize = n * n;
  const out = Array.from({ length: outSize }, () => Array(outSize).fill(0));

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

/**
 * Main solve function.
 * @param {number[][]} grid
 * @returns {number[][]}
 */
function solve(grid) {
  const color = findPrimaryColor(grid);
  const inverted = invertGrid(grid, color);
  return applyTiling(grid, inverted);
}