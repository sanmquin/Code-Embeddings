/**
 * Repeats a row a specified number of times by concatenating it with itself.
 * 
 * @param {number[]} row - The source array of integers to repeat.
 * @param {number} times - The number of times the row should be repeated.
 * @returns {number[]} A new array containing the repeated sequence of the input row.
 */
export function repeatRow(row: number[], times: number): number[] {
  let result: number[] = [];
  for (let i = 0; i < times; i++) {
    result = result.concat(row);
  }
  return result;
}