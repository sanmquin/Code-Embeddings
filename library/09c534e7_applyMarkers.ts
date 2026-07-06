export function applyMarkers(
  result: number[][],
  cells: [number, number][],
  marker: number
): void {
  for (const [r, c] of cells) {
    result[r][c] = marker;
  }
}