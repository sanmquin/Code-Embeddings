interface Component {
  r: number[];
  c: number[];
  color: number;
}

interface Dimensions {
  h: number;
  w: number;
}

/**
 * Calculates the dimensions of the bounding box for a given component.
 * @param comp - The component object containing pixel coordinates.
 * @returns An object containing the height (h) and width (w) of the bounding box.
 */
export function getComponentDimensions(comp: Component): Dimensions {
  const h = Math.max(...comp.r) - Math.min(...comp.r) + 1;
  const w = Math.max(...comp.c) - Math.min(...comp.c) + 1;
  return { h, w };
}