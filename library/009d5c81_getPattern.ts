/**
 * Normalizes a grid's structure by identifying all cells with value 1 and returning a 
 * stringified representation of their relative positions.
 * 
 * @param {number[][]} grid - The input 2D grid containing integers.
 * @returns {string} A JSON string representing the sorted list of [row, col] offsets.
 */
function getPattern(grid: number[][]): string {
    let minR: number = Infinity;
    let minC: number = Infinity;
    const ones: [number, number][] = [];

    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            if (grid[r][c] === 1) {
                ones.push([r, c]);
                if (r < minR) minR = r;
                if (c < minC) minC = c;
            }
        }
    }

    const normalized = ones
        .map(([r, c]): [number, number] => [r - minR, c - minC])
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    return JSON.stringify(normalized);
}