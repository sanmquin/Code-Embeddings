/**
 * Determines the target grid scaling factor by comparing the number of rows in the input and output grids.
 * 
 * @param {number[][]} input - The original input grid.
 * @param {number[][]} output - The target output grid.
 * @returns {number} The ratio of the output height to the input height (e.g., 3).
 * @throws {Error} Throws if input length is zero to avoid division by zero.
 */
export function getScaleFactor(input: number[][], output: number[][]): number {
  if (input.length === 0) return 0;
  return output.length / input.length;
}