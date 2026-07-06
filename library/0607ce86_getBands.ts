/**
 * Groups consecutive indices where counts meet or exceed the threshold into contiguous bands.
 * 
 * @param {number[]} counts - The input array representing counts at each index.
 * @param {number} threshold - The minimum value to include an index in a band.
 * @param {number} length - The total length of the range to inspect.
 * @returns {[number, number][]} An array of [start, end] tuples representing contiguous bands.
 */
export function getBands(counts: number[], threshold: number, length: number): [number, number][] {
  const bands: [number, number][] = [];
  for (let i = 0; i < length; ) {
    if (counts[i] >= threshold) {
      const start: number = i;
      while (i < length && counts[i] >= threshold) {
        i++;
      }
      bands.push([start, i - 1]);
    } else {
      i++;
    }
  }
  return bands;
}