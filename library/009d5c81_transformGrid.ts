/**
 * Transforms the grid by applying a specific color replacement rule.
 * 
 * @param {number[][]} grid - The original 2D grid to transform.
 * @param {number} color - The color value to apply where value 8 exists.
 * @returns {number[][]} A new 2D grid with applied transformations.
 */
function transformGrid(grid: number[][], color: number): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;
    const result: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const val = grid[r][c];
            if (val === 8) {
                result[r][c] = color;
            } else if (val === 1) {
                result[r][c] = 0;
            } else {
                result[r][c] = val;
            }
        }
    }
    return result;
}