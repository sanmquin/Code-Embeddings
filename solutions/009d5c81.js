/**
 * Orchestrates the grid transformation by identifying a pattern of 1s and using it
 * as a key to map 8s to a new color.
 * @param {number[][]} grid - The input 2D grid.
 * @returns {number[][]} The transformed 2D grid.
 */
function solve(grid) {
    const rows = grid.length;
    const cols = grid[0].length;

    const onesPositions = getPositions(grid, 1);
    const patternKey = getNormalizedPatternKey(onesPositions);

    const colorMap = getPatternToColorMap();
    const replacementColor = colorMap[patternKey];

    if (replacementColor === undefined) {
        return grid;
    }

    return transformGrid(grid, replacementColor);
}

/**
 * Finds all coordinates of a specific value in the grid.
 * @param {number[][]} grid 
 * @param {number} value 
 * @returns {Array<[number, number]>} List of [row, col] coordinates.
 */
function getPositions(grid, value) {
    const positions = [];
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            if (grid[r][c] === value) positions.push([r, c]);
        }
    }
    return positions;
}

/**
 * Normalizes positions relative to the top-left-most cell and creates a string key.
 * @param {Array<[number, number]>} positions
 * @returns {string}
 */
function getNormalizedPatternKey(positions) {
    const minR = Math.min(...positions.map(p => p[0]));
    const minC = Math.min(...positions.map(p => p[1]));
    
    const normalized = positions
        .map(p => `${p[0] - minR},${p[1] - minC}`)
        .sort();
        
    return normalized.join('|');
}

/**
 * Returns a lookup map for known shape keys.
 * @returns {Object} 
 */
function getPatternToColorMap() {
    return {
        // Plus shape
        "0,1|1,0|1,1|1,2|2,1": 2,
        // Down-arrow
        "0,0|0,2|1,1|2,0|2,1|2,2": 3,
        // Up-arrow
        "0,0|0,1|0,2|1,0|1,2|2,1": 7
    };
}

/**
 * Builds a new grid: 8s become the replacementColor, 1s become 0, others remain.
 * @param {number[][]} grid 
 * @param {number} color 
 * @returns {number[][]} 
 */
function transformGrid(grid, color) {
    return grid.map(row => 
        row.map(cell => {
            if (cell === 8) return color;
            if (cell === 1) return 0;
            return cell;
        })
    );
}