export function getConnectedComponent(
  grid: number[][],
  r: number,
  c: number,
  visited: boolean[][],
  background: number
): [number, number][] {
  const q: [number, number][] = [[r, c]];
  const component: [number, number][] = [];
  visited[r][c] = true;
  
  const H = grid.length;
  const W = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (q.length > 0) {
    const [currR, currC] = q.shift()!;
    component.push([currR, currC]);
    
    for (const [dr, dc] of dirs) {
      const nr = currR + dr;
      const nc = currC + dc;
      if (nr >= 0 && nr < H && nc >= 0 && nc < W && !visited[nr][nc] && grid[nr][nc] !== background) {
        visited[nr][nc] = true;
        q.push([nr, nc]);
      }
    }
  }
  return component;
}