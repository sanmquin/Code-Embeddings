interface Component {
  r: number[];
  c: number[];
  color: number;
}

/**
 * Writes a component's pixel data into the destination grid at a specific coordinate.
 * @param result - The 2D target grid to modify.
 * @param comp - The component data to write.
 * @param offsetR - The starting row position in the target grid.
 * @param offsetC - The starting column position in the target grid.
 */
export function writeComponent(result: number[][], comp: Component, offsetR: number, offsetC: number): void {
  const minR = Math.min(...comp.r);
  const minC = Math.min(...comp.c);
  const rows = result.length;
  const cols = result[0].length;

  for (let i = 0; i < comp.r.length; i++) {
    const targetR = offsetR + (comp.r[i] - minR);
    const targetC = offsetC + (comp.c[i] - minC);
    if (targetR >= 0 && targetR < rows && targetC >= 0 && targetC < cols) {
      result[targetR][targetC] = comp.color;
    }
  }
}