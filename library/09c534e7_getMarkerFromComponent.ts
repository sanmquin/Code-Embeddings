export function getMarkerFromComponent(
  grid: number[][],
  component: [number, number][],
  background: number,
  filler: number
): number | null {
  for (const [r, c] of component) {
    if (grid[r][c] !== background && grid[r][c] !== filler) {
      return grid[r][c];
    }
  }
  return null;
}