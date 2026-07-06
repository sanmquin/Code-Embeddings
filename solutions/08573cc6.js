/**
 * Finds the coordinates of a specific value in a grid.
 * @param {number[][]} grid 
 * @param {number} value 
 * @returns {[number, number]} [row, col]
 */
function findValueCoords(grid, value) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === value) return [r, c];
    }
  }
  return [0, 0];
}

/**
 * Draws a rectangular spiral starting from a point.
 * @param {number[][]} grid 
 * @param {number} c1 Color 1
 * @param {number} c2 Color 2
 * @returns {number[][]} Resulting grid
 */
function drawSpiral(grid, c1, c2) {
  const rows = grid.length;
  const cols = grid[0].length;
  const [cr, cc] = findValueCoords(grid, 1);
  const out = Array.from({ length: rows }, () => Array(cols).fill(0));
  out[cr][cc] = 1;

  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const colors = [c1, c2, c1, c2];

  let r = cr, c = cc;
  let segLen = 2;
  let dirIdx = 0;

  while (true) {
    const [dr, dc] = dirs[dirIdx % 4];
    const color = colors[dirIdx % 4];

    for (let i = 0; i < segLen; i++) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        out[nr][nc] = color;
        r = nr;
        c = nc;
      } else {
        return out;
      }
    }
    segLen++;
    dirIdx++;
  }
}

/**
 * Orchestrates the spiral drawing process.
 * @param {number[][]} grid 
 * @returns {number[][]} Resulting grid
 */
function solve(grid) {
  const c1 = grid[0][0];
  const c2 = grid[0][1];
  return drawSpiral(grid, c1, c2);
}