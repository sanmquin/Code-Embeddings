/**
 * Performs a deep clone of a 2D array.
 * @param {number[][]} grid 
 * @returns {number[][]}
 */
function cloneGrid(grid) {
  return grid.map(row => [...row]);
}

/**
 * Gets the connected components of color 2 in the grid using BFS.
 * @param {number[][]} grid 
 * @returns {Array<{r: number, c: number}[]>}
 */
function findComponents(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const components = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 2 && !visited[r][c]) {
        const component = [];
        const queue = [[r, c]];
        visited[r][c] = true;

        while (queue.length > 0) {
          const [currR, currC] = queue.shift();
          component.push({ r: currR, c: currC });

          const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dr, dc] of neighbors) {
            const nr = currR + dr, nc = currC + dc;
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

/**
 * Fills the interior of a rectangle component with the calculated color.
 * @param {number[][]} grid 
 * @param {{r: number, c: number}[]} component 
 */
function fillComponentInterior(grid, component) {
  if (component.length <= 1) return;

  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const { r, c } of component) {
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
    minC = Math.min(minC, c);
    maxC = Math.max(maxC, c);
  }

  const interiorH = maxR - minR - 1;
  const interiorW = maxC - minC - 1;
  if (interiorH <= 0 || interiorW <= 0) return;

  const fillColor = Math.floor(24 / Math.max(interiorW, interiorH));

  for (let r = minR + 1; r < maxR; r++) {
    for (let c = minC + 1; c < maxC; c++) {
      if (grid[r][c] === 0) {
        grid[r][c] = fillColor;
      }
    }
  }
}

/**
 * Orchestrates the puzzle-solving logic.
 * @param {number[][]} grid 
 * @returns {number[][]}
 */
function solve(grid) {
  const result = cloneGrid(grid);
  const components = findComponents(result);
  
  for (const component of components) {
    fillComponentInterior(result, component);
  }
  
  return result;
}