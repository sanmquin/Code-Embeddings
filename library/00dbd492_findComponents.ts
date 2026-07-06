export interface Point {
  r: number;
  c: number;
}

/**
 * Finds connected components of a target marker value in a 2D grid using BFS.
 * 
 * @param {number[][]} grid - The 2D grid to search.
 * @param {number} marker - The target value to group.
 * @returns {Point[][]} An array of arrays, where each inner array contains the coordinates of a distinct connected component.
 */
export function findComponents(grid: number[][], marker: number): Point[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const components: Point[][] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === marker && !visited[r][c]) {
        const comp: Point[] = [];
        const queue: Point[] = [{ r, c }];
        visited[r][c] = true;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          comp.push(curr);
          
          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dr, dc] of dirs) {
            const nr = curr.r + dr;
            const nc = curr.c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && grid[nr][nc] === marker) {
              visited[nr][nc] = true;
              queue.push({ r: nr, c: nc });
            }
          }
        }
        components.push(comp);
      }
    }
  }
  return components;
}