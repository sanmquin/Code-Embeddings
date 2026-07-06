/**
 * Determines a threshold value to separate signal from noise based on a collection of counts.
 * Finds the largest gap between sorted unique values to identify a partition point.
 * 
 * @param {number[]} counts - Array of numeric frequencies or counts to analyze.
 * @returns {number} The calculated threshold value.
 */
export function findThreshold(counts: number[]): number {
  const sorted: number[] = [...new Set(counts)].sort((a, b) => a - b);
  
  if (sorted.length <= 1) {
    return (sorted[0] || 0) + 0.5;
  }

  let maxGap: number = 0;
  let threshold: number = sorted[sorted.length - 1] * 0.5;

  for (let i = 0; i < sorted.length - 1; i++) {
    const gap: number = sorted[i + 1] - sorted[i];
    if (gap > maxGap) {
      maxGap = gap;
      threshold = (sorted[i] + sorted[i + 1]) / 2;
    }
  }

  return threshold;
}