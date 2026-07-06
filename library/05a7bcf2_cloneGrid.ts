/**
 * Creates a deep copy of a 2D grid.
 * 
 * @param {number[][]} grid - The original 2D array to clone.
 * @returns {number[][]} A new 2D array with the same values as the input grid.
 */
export function cloneGrid(grid: number[][]): number[][] {
  return grid.map((row: number[]) => [...row]);
}