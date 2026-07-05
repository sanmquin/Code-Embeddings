interface Point {
  r: number;
  c: number;
}

/**
 * Finds all connected components of the value 2 in a 2D grid using BFS.
 * Connectivity is defined as adjacent cells sharing an edge (up, down, left, right).
 * 
 * @param {number[][]} grid - The input grid to scan for components.
 * @returns {Point[][]} An array of components, where each component is an array of coordinate objects.
 */
export function findComponents(grid: number[][]): Point[][] {
  const rows: number = grid.length;
  const cols: number = grid[0].length;
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const components: Point[][] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2 && !visited[r][c]) {
        const component: Point[] = [];
        const queue: [number, number][] = [[r, c]];
        visited[r][c] = true;

        while (queue.length > 0) {
          const [currR, currC] = queue.shift()!;
          component.push({ r: currR, c: currC });

          const neighbors: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dr, dc] of neighbors) {
            const nr: number = currR + dr;
            const nc: number = currC + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && grid[nr][nc] === 2) {
              visited[nr][nc] = true;
              queue.push([nr, nc]);
            }
          }
        }
        components.push(component);
      }
    }
  }
  return components;
}