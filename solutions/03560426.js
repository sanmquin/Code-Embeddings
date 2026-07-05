/**
 * Finds all connected components of non-zero colors in a grid.
 * @param {number[][]} grid - The input grid.
 * @returns {Array<{r: number[], c: number[], color: number}>} Array of components.
 */
function findComponents(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const components = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 0 && !visited[r][c]) {
        const color = grid[r][c];
        const cells = [];
        const queue = [[r, c]];
        visited[r][c] = true;

        while (queue.length > 0) {
          const [currR, currC] = queue.shift();
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

/**
 * Writes a component to the result grid at a specified offset.
 * @param {number[][]} result - The grid to write into.
 * @param {object} comp - The component object.
 * @param {number} offsetR - The row offset.
 * @param {number} offsetC - The column offset.
 */
function writeComponent(result, comp, offsetR, offsetC) {
  const minR = Math.min(...comp.r);
  const minC = Math.min(...comp.c);
  const rows = result.length;
  const cols = result[0].length;

  for (let i = 0; i < comp.r.length; i++) {
    const targetR = offsetR + (comp.r[i] - minR);
    const targetC = offsetC + (comp.c[i] - minC);
    if (targetR < rows && targetC < cols) {
      result[targetR][targetC] = comp.color;
    }
  }
}

/**
 * Calculates the dimensions of a component.
 * @param {object} comp - The component object.
 * @returns {{h: number, w: number}} The height and width of the component.
 */
function getComponentDimensions(comp) {
  const h = Math.max(...comp.r) - Math.min(...comp.r) + 1;
  const w = Math.max(...comp.c) - Math.min(...comp.c) + 1;
  return { h, w };
}

/**
 * Solves the ARC puzzle by reassembling components into a top-left aligned stack.
 * @param {number[][]} grid - The input grid.
 * @returns {number[][]} The transformed grid.
 */
function solve(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const components = findComponents(grid);

  // Sort components by their original column position to maintain order
  components.sort((a, b) => Math.min(...a.c) - Math.min(...b.c));

  const result = Array.from({ length: rows }, () => Array(cols).fill(0));
  let currR = 0;
  let currC = 0;

  for (const comp of components) {
    writeComponent(result, comp, currR, currC);
    const { h, w } = getComponentDimensions(comp);
    currR += (h - 1);
    currC += (w - 1);
  }

  return result;
}