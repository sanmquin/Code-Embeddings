/**
 * Creates an empty grid of size rows x cols filled with zeros.
 * 
 * @param rows - The number of rows in the grid.
 * @param cols - The number of columns in the grid.
 * @returns A 2D array initialized with 0.
 */
export function createEmptyGrid(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}