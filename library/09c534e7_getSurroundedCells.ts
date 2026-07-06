export function getSurroundedCells(
  grid: number[][],
  component: [number, number][],
  background: number
): [number, number][] {
  const H = grid.length;
  const W = grid[0].length;
  const targetCells: [number, number][] = [];

  for (const [r, c] of component) {
    if (grid[r][c] === 1) {
      let surrounded = true;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= H || nc < 0 || nc >= W || grid[nr][nc] === background) {
            surrounded = false;
            break;
          }
        }
        if (!surrounded) break;
      }
      if (surrounded) targetCells.push([r, c]);
    }
  }
  return targetCells;
}