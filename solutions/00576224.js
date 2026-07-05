/**
 * Tiling utilities for ARC grid manipulation.
 */

/**
 * Flips a row array horizontally.
 * @param {Array<number>} row - The original grid row.
 * @returns {Array<number>} A new array representing the flipped row.
 */
function flipRow(row) {
  return [...row].reverse();
}

/**
 * Creates a row repeated a specific number of times.
 * @param {Array<number>} row - The row to repeat.
 * @param {number} times - How many times to repeat the row.
 * @returns {Array<number>} The tiled row.
 */
function tileRow(row, times) {
  let result = [];
  for (let i = 0; i < times; i++) {
    result = result.concat(row);
  }
  return result;
}

/**
 * Generates a single block row based on the block index and input grid.
 * @param {Array<Array<number>>} grid - The input grid.
 * @param {number} blockIndex - The vertical index of the block (0, 1, 2).
 * @param {number} repeatCount - Number of times to repeat the grid width-wise.
 * @returns {Array<Array<number>>} The processed grid block.
 */
function processBlockRow(grid, blockIndex, repeatCount) {
  const isFlipped = blockIndex % 2 !== 0;
  return grid.map(row => {
    const processedRow = isFlipped ? flipRow(row) : row;
    return tileRow(processedRow, repeatCount);
  });
}

/**
 * Orchestrates the tiling process to transform a 2x2 grid into a 6x6 grid.
 * @param {Array<Array<number>>} grid - The input 2x2 grid.
 * @returns {Array<Array<number>>} The transformed 6x6 grid.
 */
function solve(grid) {
  const TOTAL_BLOCK_ROWS = 3;
  const REPEAT_COUNT = 3;
  let output = [];

  for (let blockIndex = 0; blockIndex < TOTAL_BLOCK_ROWS; blockIndex++) {
    const block = processBlockRow(grid, blockIndex, REPEAT_COUNT);
    output = output.concat(block);
  }

  return output;
}