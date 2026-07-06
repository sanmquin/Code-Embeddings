/**
 * Deep copy a 2D grid.
 * @param {Array<Array<number>>} grid 
 * @returns {Array<Array<number>>}
 */
function cloneGrid(grid) {
    return grid.map(row => [...row]);
}

/**
 * Detects the barrier line (a solid line of color 8) and its orientation.
 * @param {Array<Array<number>>} grid 
 * @returns {{type: 'h'|'v'|null, pos: number|null}} 
 */
function getBarrierInfo(grid) {
    const H = grid.length;
    const W = grid[0].length;
    for (let r = 0; r < H; r++) if (grid[r].every(v => v === 8)) return { type: 'h', pos: r };
    for (let c = 0; c < W; c++) if (grid.every(row => row[c] === 8)) return { type: 'v', pos: c };
    return { type: null, pos: null };
}

/**
 * Processes a 1D vector (row or column) to apply the projection logic.
 * @param {Array<number>} vector 
 * @param {number} barrierPos 
 * @returns {Array<number>}
 */
function processVector(vector, barrierPos) {
    const res = [...vector];
    const fours = vector.map((v, i) => v === 4 ? i : -1).filter(i => i !== -1);
    if (fours.length === 0) return res;

    const first4 = Math.min(...fours);
    const last4 = Math.max(...fours);

    // 4s become 3s
    fours.forEach(i => res[i] = 3);

    if (last4 < barrierPos) {
        // Marker is before barrier (Top/Left side)
        for (let i = last4 + 1; i < barrierPos; i++) res[i] = 4;
        const pushers = vector.slice(barrierPos + 1).filter(v => v === 2).length;
        for (let i = barrierPos + 1; i < vector.length; i++) res[i] = 8;
        for (let i = vector.length - pushers; i < vector.length; i++) res[i] = 2;
    } else if (first4 > barrierPos) {
        // Marker is after barrier (Bottom/Right side)
        for (let i = barrierPos + 1; i < first4; i++) res[i] = 4;
        const pushers = vector.slice(0, barrierPos).filter(v => v === 2).length;
        for (let i = 0; i < barrierPos; i++) res[i] = 8;
        for (let i = 0; i < pushers; i++) res[i] = 2;
    }
    return res;
}

/**
 * Solves the ARC challenge by applying the beam logic relative to the barrier (8s).
 * @param {Array<Array<number>>} grid 
 * @returns {Array<Array<number>>}
 */
function solve(grid) {
    const { type, pos } = getBarrierInfo(grid);
    if (type === null) return grid;

    let result = cloneGrid(grid);
    if (type === 'h') {
        for (let c = 0; c < grid[0].length; c++) {
            const col = result.map(row => row[c]);
            const newCol = processVector(col, pos);
            newCol.forEach((v, r) => result[r][c] = v);
        }
    } else {
        for (let r = 0; r < grid.length; r++) {
            result[r] = processVector(result[r], pos);
        }
    }
    return result;
}