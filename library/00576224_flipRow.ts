/**
 * Flips a row horizontally by reversing its elements.
 * 
 * @param {number[]} row - The input row of integers to be flipped.
 * @returns {number[]} A new array containing the elements of the input row in reverse order.
 */
export function flipRow(row: number[]): number[] {
  return [...row].reverse();
}