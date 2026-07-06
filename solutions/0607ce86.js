/**
 * Orchestrates the cleaning of a noisy tiled grid.
 * @param {number[][]} grid - The input matrix.
 * @returns {number[][]} - The cleaned matrix.
 */
function solve(grid) {
    const rows = grid.length;
    const cols = grid[0].length;

    const rowCounts = grid.map(r => r.filter(c => c !== 0).length);
    const colCounts = Array.from({ length: cols }, (_, c) => grid.map(r => r[c]).filter(v => v !== 0).length);

    const thrR = findThreshold(rowCounts);
    const thrC = findThreshold(colCounts);

    const rowBands = getBands(rowCounts, thrR, rows);
    const colBands = getBands(colCounts, thrC, cols);

    const tileH = getMode(rowBands.map(b => b[1] - b[0] + 1));
    const tileW = getMode(colBands.map(b => b[1] - b[0] + 1));

    const filteredRowBands = rowBands.filter(b => b[1] - b[0] + 1 === tileH);
    const filteredColBands = colBands.filter(b => b[1] - b[0] + 1 === tileW);

    const tiles = [];
    for (const rb of filteredRowBands) {
        for (const cb of filteredColBands) {
            tiles.push(extractTile(grid, rb[0], cb[0], tileH, tileW));
        }
    }

    const canonical = computeMajorityTile(tiles, tileH, tileW);

    return reconstructGrid(rows, cols, filteredRowBands, filteredColBands, canonical, tileH, tileW);
}

function findThreshold(counts) {
    const sorted = [...new Set(counts)].sort((a, b) => a - b);
    if (sorted.length <= 1) return (sorted[0] || 0) + 0.5;
    let maxGap = 0, threshold = sorted[sorted.length - 1] * 0.5;
    for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i + 1] - sorted[i];
        if (gap > maxGap) { maxGap = gap; threshold = (sorted[i] + sorted[i + 1]) / 2; }
    }
    return threshold;
}

function getBands(counts, threshold, length) {
    const bands = [];
    for (let i = 0; i < length;) {
        if (counts[i] >= threshold) {
            let start = i;
            while (i < length && counts[i] >= threshold) i++;
            bands.push([start, i - 1]);
        } else i++;
    }
    return bands;
}

function getMode(arr) {
    const counts = new Map();
    arr.forEach(x => counts.set(x, (counts.get(x) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function extractTile(grid, rStart, cStart, h, w) {
    return grid.slice(rStart, rStart + h).map(row => row.slice(cStart, cStart + w));
}

function computeMajorityTile(tiles, h, w) {
    const canonical = Array.from({ length: h }, () => Array(w).fill(0));
    for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
            const votes = new Map();
            tiles.forEach(t => votes.set(t[r][c], (votes.get(t[r][c]) || 0) + 1));
            canonical[r][c] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
        }
    }
    return canonical;
}

function reconstructGrid(rows, cols, rBands, cBands, canonical, h, w) {
    const output = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (const rb of rBands) {
        for (const cb of cBands) {
            for (let r = 0; r < h; r++) {
                for (let c = 0; c < w; c++) {
                    output[rb[0] + r][cb[0] + c] = canonical[r][c];
                }
            }
        }
    }
    return output;
}