/**
 * Orchestrates the solution process by identifying logic parameters and applying transformations.
 * @param {number[][]} grid 
 * @returns {number[][]} 
 */
function solve(grid) {
  const background = getBackgroundValue(grid);
  const filler = getFillerValue(grid);
  const H = grid.length;
  const W = grid[0].length;
  const result = grid.map(row => [...row]);
  const visited = Array.from({ length: H }, () => Array(W).fill(false));

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (!visited[r][c] && grid[r][c] !== background) {
        const component = getConnectedComponent(grid, r, c, visited, background);
        const marker = getMarkerFromComponent(grid, component, background, filler);
        if (marker !== null) {
          const targetCells = getSurroundedCells(grid, component, background);
          applyMarkers(result, targetCells, marker);
        }
      }
    }
  }
  return result;
}

/**
 * @param {number[][]} grid 
 * @returns {number} 
 */
function getBackgroundValue(grid) { return grid[0][0]; }

/**
 * @param {number[][]} grid 
 * @returns {number} 
 */
function getFillerValue(grid) { return 1; }

/**
 * @param {number[][]} grid 
 * @param {number} r 
 * @param {number} c 
 * @param {boolean[][]} visited 
 * @param {number} background 
 * @returns {Array<[number, number]>} 
 */
function getConnectedComponent(grid, r, c, visited, background) {
  const q = [[r, c]];
  const component = [];
  visited[r][c] = true;
  while (q.length > 0) {
    const [currR, currC] = q.shift();
    component.push([currR, currC]);
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = currR + dr, nc = currC + dc;
      if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length && !visited[nr][nc] && grid[nr][nc] !== background) {
        visited[nr][nc] = true;
        q.push([nr, nc]);
      }
    }
  }
  return component;
}

/**
 * @param {number[][]} grid 
 * @param {Array<[number, number]>} component 
 * @param {number} background 
 * @param {number} filler 
 * @returns {number|null} 
 */
function getMarkerFromComponent(grid, component, background, filler) {
  for (const [r, c] of component) {
    if (grid[r][c] !== background && grid[r][c] !== filler) return grid[r][c];
  }
  return null;
}

/**
 * @param {number[][]} grid 
 * @param {Array<[number, number]>} component 
 * @param {number} background 
 * @returns {Array<[number, number]>} 
 */
function getSurroundedCells(grid, component, background) {
  const H = grid.length;
  const W = grid[0].length;
  const targetCells = [];
  for (const [r, c] of component) {
    if (grid[r][c] === 1) {
      let surrounded = true;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= H || nc < 0 || nc >= W || grid[nr][nc] === background) {
            surrounded = false; break;
          }
        }
        if (!surrounded) break;
      }
      if (surrounded) targetCells.push([r, c]);
    }
  }
  return targetCells;
}

/**
 * @param {number[][]} result 
 * @param {Array<[number, number]>} cells 
 * @param {number} marker 
 */
function applyMarkers(result, cells, marker) {
  for (const [r, c] of cells) {
    result[r][c] = marker;
  }
}