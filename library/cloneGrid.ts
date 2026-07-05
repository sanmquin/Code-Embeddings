/**
 * Performs a deep clone of a 2D array of numbers.
 * 
 * @param {number[][]} grid - The input 2D array to be cloned.
 * @returns {number[][]} A new 2D array containing the same values as the original.
 */
export function cloneGrid(grid: number[][]): number[][] {
  return grid.map((row: number[]) => [...row]);
}