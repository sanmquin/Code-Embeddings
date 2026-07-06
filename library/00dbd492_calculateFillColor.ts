/**
 * Calculates the fill color for a rectangle based on its dimensions.
 * 
 * @param {number} w - The width of the rectangle.
 * @param {number} h - The height of the rectangle.
 * @returns {number} The integer representing the calculated color.
 */
export function calculateFillColor(w: number, h: number): number {
  return Math.floor(24 / Math.max(w, h));
}