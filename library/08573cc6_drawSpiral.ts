/**
 * Draws a rectangular spiral outward starting from the position of the value '1'.
 * The spiral expands its segment length every two turns and alternates between two provided colors.
 * 
 * @param {number[][]} grid - The source grid used to determine grid dimensions and the starting point.
 * @param {number} c1 - The first color value used for the spiral segments.
 * @param {number} c2 - The second color value used for the spiral segments.
 * @returns {number[][]} A new 2D grid containing the drawn spiral pattern.
 */
function drawSpiral(grid: number[][], c1: number, c2: number): number[][] {
  const rows: number = grid.length;
  const cols: number = grid[0].length;
  const [cr, cc]: [number, number] = findValueCoords(grid, 1);
  
  const out: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  out[cr][cc] = 1;

  const dirs: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const colors: number[] = [c1, c2, c1, c2];

  let r: number = cr;
  let c: number = cc;
  let segLen: number = 2;
  let dirIdx: number = 0;

  while (true) {
    const [dr, dc]: [number, number] = dirs[dirIdx % 4];
    const color: number = colors[dirIdx % 4];

    for (let i = 0; i < segLen; i++) {
      const nr: number = r + dr;
      const nc: number = c + dc;
      
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