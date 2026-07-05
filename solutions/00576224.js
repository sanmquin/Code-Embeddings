/**
 * Flips a row horizontally.
 * @param {Array<number>} row - The input row.
 * @returns {Array<number>} The flipped row.
 */
function flipRow(row) {
  return [...row].reverse();
}

/**
 * Repeats a row a specified number of times by concatenation.
 * @param {Array<number>} row - The row to repeat.
 * @param {number} times - How many times to repeat.
 * @returns {Array<number>} The repeated row.
 */
function repeatRow(row, times) {
  let result = [];
  for (let i = 0; i < times; i++) {
    result = result.concat(row);
  }
  return result;
}

/**
 * Determines the target grid size factor by comparing input and output dimensions.
 * @param {Array<Array<number>>} input - The input grid.
 * @param {Array<Array<number>>} output - The output grid.
 * @returns {number} The scaling factor (e.g., 3).
 */
function getScaleFactor(input, output) {
  return output.length / input.length;
}

/**
 * Orchestrates the tiling transformation.
 * @param {Array<Array<number>>} grid - The input grid.
 * @param {Array<Object>} training - The training set used to derive parameters.
 * @returns {Array<Array<number>>} The transformed grid.
 */
function solve(grid, training) {
  const example = training[0];
  const factor = getScaleFactor(example.input, example.output);
  const rows = grid.length;
  const output = [];

  for (let blockRow = 0; blockRow < factor; blockRow++) {
    for (let i = 0; i < rows; i++) {
      const sourceRow = (blockRow % 2 === 0) ? grid[i] : flipRow(grid[i]);
      output.push(repeatRow(sourceRow, factor));
    }
  }

  return output;
}