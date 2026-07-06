/**
 * Finds all connected components of non-zero colors in the grid.
 * @param {number[][]} grid
 * @returns {Array<{minC: number, minR: number, color: number, h: number, w: number}>}
 */
function findBlocks(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const blocks = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 0 && !visited[r][c]) {
        const color = grid[r][c];
        const queue = [[r, c]];
        visited[r][c] = true;
        const cells = [[r, c]];
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
        const minR = Math.min(...cells.map(x => x[0]));
        const maxR = Math.max(...cells.map(x => x[0]));
        const minC = Math.min(...cells.map(x => x[1]));
        const maxC = Math.max(...cells.map(x => x[1]));
        blocks.push({ minC, minR, color, h: maxR - minR + 1, w: maxC - minC + 1 });
      }
    }
  }
  return blocks.sort((a, b) => a.minC - b.minC || a.minR - b.minR);
}

/**
 * Orchestrates the transformation by calculating parameters from training data 
 * and applying them to the grid.
 * @param {number[][]} grid 
 * @param {Array<Object>} training 
 * @returns {number[][]} 
 */
function solve(grid, training) {
  // In this task, the pattern is consistent across training examples:
  // Blocks are extracted and placed diagonally starting from (0,0).
  const blocks = findBlocks(grid);
  const emptyGrid = createEmptyGrid(grid.length, grid[0].length);
  return placeBlocksDiagonally(emptyGrid, blocks);
}

/**
 * Creates an empty grid.
 * @param {number} rows 
 * @param {number} cols 
 * @returns {number[][]} 
 */
function createEmptyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

/**
 * Places blocks onto a grid in a diagonal stack pattern.
 * @param {number[][]} grid 
 * @param {Array} blocks 
 * @returns {number[][]} 
 */
function placeBlocksDiagonally(grid, blocks) {
  let currentR = 0;
  let currentC = 0;
  const rows = grid.length;
  const cols = grid[0].length;

  for (const block of blocks) {
    for (let dr = 0; dr < block.h; dr++) {
      for (let dc = 0; dc < block.w; dc++) {
        const nr = currentR + dr;
        const nc = currentC + dc;
        if (nr < rows && nc < cols) {
          grid[nr][nc] = block.color;
        }
      }
    }
    currentR += (block.h - 1);
    currentC += (block.w - 1);
  }
  return grid;
}