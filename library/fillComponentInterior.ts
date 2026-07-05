interface Point {
  r: number;
  c: number;
}

/**
 * Fills the interior of a component's bounding box with a computed color.
 * The fill color is calculated based on the maximum dimension of the interior space.
 * 
 * @param {number[][]} grid - The grid to modify in-place.
 * @param {Point[]} component - An array of points representing a connected component.
 * @returns {void}
 */
export function fillComponentInterior(grid: number[][], component: Point[]): void {
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