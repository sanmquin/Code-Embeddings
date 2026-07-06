/**
 * Places a canonical tile into every intersection defined by row and column bands.
 * 
 * @param {number} rows - Total rows in the output grid.
 * @param {number} cols - Total columns in the output grid.
 * @param {[number, number][]} rBands - Array of row band intervals.
 * @param {[number, number][]} cBands - Array of column band intervals.
 * @param {number[][]} canonical - The template tile to stamp.
 * @param {number} h - The height of the canonical tile.
 * @param {number} w - The width of the canonical tile.
 * @returns {number[][]} The newly reconstructed 2D grid.
 */
export function reconstructGrid(
  rows: number, 
  cols: number, 
  rBands: [number, number][], 
  cBands: [number, number][], 
  canonical: number[][], 
  h: number, 
  w: number
): number[][] {
  const output: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  
  for (const rb of rBands) {
    for (const cb of cBands) {
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          output[rb[0] + r][cb[0] + c] = canonical[r][c];
        }
      }
    }
  }
  return output;
}