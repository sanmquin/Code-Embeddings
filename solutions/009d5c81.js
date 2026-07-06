/**
 * @param {number[][]} grid 
 * @returns {number[][]} 
 */
function getPattern(grid) {
    let minR = Infinity, minC = Infinity;
    const ones = [];
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            if (grid[r][c] === 1) {
                ones.push([r, c]);
                if (r < minR) minR = r;
                if (c < minC) minC = c;
            }
        }
    }
    return JSON.stringify(ones.map(([r, c]) => [r - minR, c - minC]).sort((a, b) => a[0] - b[0] || a[1] - b[1]));
}

/**
 * @param {Array<{input: number[][], output: number[][]}>} training 
 * @returns {Map<string, number>} 
 */
function buildPatternMap(training) {
    const map = new Map();
    for (const ex of training) {
        const pattern = getPattern(ex.input);
        let color = 0;
        for (let r = 0; r < ex.output.length; r++) {
            for (let c = 0; c < ex.output[0].length; c++) {
                if (ex.output[r][c] !== 0 && ex.output[r][c] !== 1) {
                    color = ex.output[r][c];
                    break;
                }
            }
        }
        map.set(pattern, color);
    }
    return map;
}

/**
 * @param {number[][]} grid 
 * @param {number} color 
 * @returns {number[][]} 
 */
function transformGrid(grid, color) {
    const rows = grid.length;
    const cols = grid[0].length;
    const result = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 8) {
                result[r][c] = color;
            } else if (grid[r][c] === 1) {
                result[r][c] = 0;
            } else {
                result[r][c] = grid[r][c];
            }
        }
    }
    return result;
}

/**
 * @param {number[][]} grid 
 * @param {Array<{input: number[][], output: number[][]}>} training 
 * @returns {number[][]} 
 */
function solve(grid, training) {
    const patternMap = buildPatternMap(training);
    const inputPattern = getPattern(grid);
    const color = patternMap.get(inputPattern) || 0;
    return transformGrid(grid, color);
}