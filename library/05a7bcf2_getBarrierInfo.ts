/**
 * Detects the barrier line (a solid line of color 8) and its orientation.
 * 
 * @param {number[][]} grid - The 2D grid to analyze.
 * @returns {{type: 'h' | 'v' | null, pos: number | null}} An object containing the orientation type and the row/column index of the barrier.
 */
export function getBarrierInfo(grid: number[][]): { type: 'h' | 'v' | null; pos: number | null } {
  const H: number = grid.length;
  const W: number = grid[0]?.length ?? 0;

  for (let r = 0; r < H; r++) {
    if (grid[r].every((v: number) => v === 8)) return { type: 'h', pos: r };
  }
  for (let c = 0; c < W; c++) {
    if (grid.every((row: number[]) => row[c] === 8)) return { type: 'v', pos: c };
  }

  return { type: null, pos: null };
}