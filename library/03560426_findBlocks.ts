export interface Block {
  minC: number;
  minR: number;
  color: number;
  h: number;
  w: number;
}

/**
 * Finds all connected components of non-zero colors in the grid using BFS.
 * 
 * @param grid - A 2D array of numbers representing the input grid.
 * @returns An array of Block objects, sorted primarily by column and secondarily by row.
 */
export function findBlocks(grid: number[][]): Block[] {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const blocks: Block[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 0 && !visited[r][c]) {
        const color = grid[r][c];
        const queue: [number, number][] = [[r, c]];
        visited[r][c] = true;
        const cells: [number, number][] = [[r, c]];
        
        let head = 0;
        while (head < queue.length) {
          const [cr, cc] = queue[head++];
          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dr, dc] of dirs) {
            const nr = cr + dr, nc = cc + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && grid[nr][nc] === color) {
              visited[nr][nc] = true;
              queue.push([nr, nc]);
              cells.push([nr, nc]);
            }
          }
        }
        
        const rowsOnly = cells.map(x => x[0]);
        const colsOnly = cells.map(x => x[1]);
        const minR = Math.min(...rowsOnly);
        const maxR = Math.max(...rowsOnly);
        const minC = Math.min(...colsOnly);
        const maxC = Math.max(...colsOnly);
        
        blocks.push({ minC, minR, color, h: maxR - minR + 1, w: maxC - minC + 1 });
      }
    }
  }
  return blocks.sort((a, b) => a.minC - b.minC || a.minR - b.minR);
}