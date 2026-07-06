/**
 * Finds all non-zero coordinate points in the grid, grouped by color.
 * @param {number[][]} grid
 * @returns {Object} Map of color to array of [r, c] coordinates.
 */
function findDots(grid) {
    const dots = {};
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

/**
 * Transforms dot coordinates into line definitions.
 * @param {Object} dots
 * @returns {Object} { hLines: Array, vLines: Array }
 */
function extractLines(dots) {
    const hLines = [];
    const vLines = [];
    for (const colorStr in dots) {
        const color = parseInt(colorStr);
        const [p1, p2] = dots[colorStr];
        if (p1[0] === p2[0]) {
            hLines.push({ r: p1[0], c1: Math.min(p1[1], p2[1]), c2: Math.max(p1[1], p2[1]), color });
        } else {
            vLines.push({ c: p1[1], r1: Math.min(p1[0], p2[0]), r2: Math.max(p1[0], p2[0]), color });
        }
    }
    return { hLines, vLines };
}

/**
 * Fills a grid based on provided line definitions.
 * @param {number[][]} grid
 * @param {Array} hLines
 * @param {Array} vLines
 * @returns {number[][]}
 */
function renderLines(grid, hLines, vLines) {
    const output = grid.map(row => [...row]);
    hLines.forEach(line => {
        for (let c = line.c1; c <= line.c2; c++) output[line.r][c] = line.color;
    });
    vLines.forEach(line => {
        for (let r = line.r1; r <= line.r2; r++) output[r][line.c] = line.color;
    });
    return output;
}

/**
 * Orchestrates the transformation.
 * @param {number[][]} grid
 * @returns {number[][]}
 */
function solve(grid) {
    const dots = findDots(grid);
    const { hLines, vLines } = extractLines(dots);
    return renderLines(grid, hLines, vLines);
}