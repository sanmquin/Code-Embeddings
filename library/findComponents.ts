interface Component {
  r: number[];
  c: number[];
  color: number;
}

/**
 * Scans the grid for connected components of non-zero colors.
 * @param grid - A 2D array representing the input puzzle grid.
 * @returns An array of objects, each defining the coordinates and color of a unique component.
 */
export function findComponents(grid: number[][]): Component[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const components: Component[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 0 && !visited[r][c]) {
        const color = grid[r][c];
        const cells: [number, number][] = [];
        const queue: [number, number][] = [[r, c]];
        visited[r][c] = true;

        while (queue.length > 0) {
          const [currR, currC] = queue.shift()!;
          cells.push([currR, currC]);
          const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dr, dc] of neighbors) {
            const nr = currR + dr, nc = currC + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && grid[nr][nc] === color) {
              visited[nr][nc] = true;
              queue.push([nr, nc]);
            }
          }
        }
        components.push({
          r: cells.map(p => p[0]),
          c: cells.map(p => p[1]),
          color
        });
      }
    }
  }
  return components;
}