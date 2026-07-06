/**
 * Finds all non-zero coordinate points in the grid, grouped by color.
 * 
 * @param {number[][]} grid - The 2D array representing the input grid.
 * @returns {Record<number, [number, number][]>} A map where keys are color integers and values are lists of [r, c] coordinates.
 */
function findDots(grid: number[][]): Record<number, [number, number][]> {
    const dots: Record<number, [number, number][]> = {};
    grid.forEach((row, r) => {
        row.forEach((val, c) => {
            if (val !== 0) {
                if (!dots[val]) dots[val] = [];
                dots[val].push([r, c]);
            }
        });
    });
    return dots;
}