/**
 * Builds a dictionary mapping normalized grid patterns to target color values derived from training data.
 * 
 * @param {Array<{input: number[][], output: number[][]}>} training - List of input-output grid pairs.
 * @returns {Map<string, number>} A map where keys are pattern strings and values are the detected target colors.
 */
function buildPatternMap(training: Array<{ input: number[][], output: number[][] }>): Map<string, number> {
    const map = new Map<string, number>();

    for (const ex of training) {
        const pattern = getPattern(ex.input);
        let color = 0;

        for (let r = 0; r < ex.output.length; r++) {
            for (let c = 0; c < ex.output[0].length; c++) {
                // Search for the target color (excluding background 0 and pattern marker 1)
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