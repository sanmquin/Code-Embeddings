/**
 * Processes a 1D vector to apply the beam projection logic.
 * 
 * @param {number[]} vector - The 1D array of integers representing a row or column.
 * @param {number} barrierPos - The index of the barrier line within the vector.
 * @returns {number[]} A new 1D array with the applied beam projection logic.
 */
export function processVector(vector: number[], barrierPos: number): number[] {
  const res: number[] = [...vector];
  const fours: number[] = vector
    .map((v: number, i: number) => (v === 4 ? i : -1))
    .filter((i: number) => i !== -1);

  if (fours.length === 0) return res;

  const first4: number = Math.min(...fours);
  const last4: number = Math.max(...fours);

  // Convert identified 4s to 3s
  fours.forEach((i: number) => (res[i] = 3));

  if (last4 < barrierPos) {
    // Marker is before barrier (Top/Left side)
    for (let i = last4 + 1; i < barrierPos; i++) res[i] = 4;
    const pushers: number = vector.slice(barrierPos + 1).filter((v: number) => v === 2).length;
    for (let i = barrierPos + 1; i < vector.length; i++) res[i] = 8;
    for (let i = vector.length - pushers; i < vector.length; i++) res[i] = 2;
  } else if (first4 > barrierPos) {
    // Marker is after barrier (Bottom/Right side)
    for (let i = barrierPos + 1; i < first4; i++) res[i] = 4;
    const pushers: number = vector.slice(0, barrierPos).filter((v: number) => v === 2).length;
    for (let i = 0; i < barrierPos; i++) res[i] = 8;
    for (let i = 0; i < pushers; i++) res[i] = 2;
  }

  return res;
}