/**
 * Tiling utilities for ARC grid transformation tasks.
 */

/**
 * Flips a row horizontally.
 * @param {Array<number>} row - The input row array.
 * @returns {Array<number>} A new array representing the flipped row.
 */
function flipRow(row) {
  return [...row].reverse();
}

/**
 * Creates a row repeated a specific number of times.
 * @param {Array<number>} row - The row to repeat.
 * @param {number} count - The number of repetitions.
 * @returns {Array<number>} The flattened, repeated row.
 */
function repeatRow(row, count) {
  let result = [];
  for (let i = 0; i < count; i++) {
    result = result.concat(row);
  }
  return result;
}

/**
 * Transforms a grid by tiling and alternating row-pair styles.
 * @param {Array<Array<number>>} grid - The source 2x2 grid.
 * @returns {Array<Array<number>>} The transformed 6x6 grid.
 */
function solve(grid) {
  const TILE_FACTOR = 3;
  const BLOCK_ROWS = 3;
  const output = [];

  for (let blockIdx = 0; blockIdx < BLOCK_ROWS; blockIdx++) {
    const isEvenBlock = blockIdx % 2 === 0;

    for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
      const currentRow = grid[rowIndex];
      const processedRow = isEvenBlock 
        ? currentRow 
        : flipRow(currentRow);

      output.push(repeatRow(processedRow, TILE_FACTOR));
    }
  }

  return output;
}

// Export for usage if in a module environment
if (typeof module !== 'undefined') {
  module.exports = { solve };
}