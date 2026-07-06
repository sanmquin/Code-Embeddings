/**
 * Finds the coordinates of the first occurrence of a specific value in a grid.
 * 
 * @param {number[][]} grid - The 2D array to search.
 * @param {number} value - The numerical value to locate.
 * @returns {[number, number]} A tuple containing the [row, column] indices of the found value, or [0, 0] if not found.
 */
function findValueCoords(grid: number[][], value: number): [number, number] {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === value) return [r, c];
    }
  }
  return [0, 0];
}