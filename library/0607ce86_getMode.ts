/**
 * Finds the most frequently occurring element in an array.
 * 
 * @param {number[]} arr - The array of numbers to analyze.
 * @returns {number} The mode value.
 */
export function getMode(arr: number[]): number {
  const counts: Map<number, number> = new Map();
  arr.forEach((x) => counts.set(x, (counts.get(x) || 0) + 1));
  
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}