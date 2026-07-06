/**
 * Fills a grid based on provided line definitions.
 * 
 * @param {number[][]} grid - The original 2D grid.
 * @param {HorizontalLine[]} hLines - Array of horizontal line segments to render.
 * @param {VerticalLine[]} vLines - Array of vertical line segments to render.
 * @returns {number[][]} A new 2D grid with the lines rendered.
 */
function renderLines(grid: number[][], hLines: HorizontalLine[], vLines: VerticalLine[]): number[][] {
    const output = grid.map(row => [...row]);
    
    hLines.forEach(line => {
        for (let c = line.c1; c <= line.c2; c++) {
            output[line.r][c] = line.color;
        }
    });
    
    vLines.forEach(line => {
        for (let r = line.r1; r <= line.r2; r++) {
            output[r][line.c] = line.color;
        }
    });
    
    return output;
}