/**
 * Creates a single canonical tile where each cell value is the most frequent value across all provided tiles.
 * 
 * @param {number[][][]} tiles - An array of 2D grids representing the tiles to aggregate.
 * @param {number} h - The height of the tiles.
 * @param {number} w - The width of the tiles.
 * @returns {number[][]} A canonical 2D matrix representing the majority vote per pixel.
 */
export function computeMajorityTile(tiles: number[][][], h: number, w: number): number[][] {
  const canonical: number[][] = Array.from({ length: h }, () => Array(w).fill(0));
  
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const votes: Map<number, number> = new Map();
      tiles.forEach((t) => votes.set(t[r][c], (votes.get(t[r][c]) || 0) + 1));
      canonical[r][c] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
  }
  return canonical;
}