export interface Bounds {
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
}

/**
 * Identifies the rectangular bounding box enclosing a component.
 * 
 * @param {Point[]} comp - An array of points representing a component.
 * @returns {Bounds} The minimum and maximum row and column indices of the component.
 */
export function getBounds(comp: Point[]): Bounds {
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const p of comp) {
    minR = Math.min(minR, p.r);
    maxR = Math.max(maxR, p.r);
    minC = Math.min(minC, p.c);
    maxC = Math.max(maxC, p.c);
  }
  return { minR, maxR, minC, maxC };
}