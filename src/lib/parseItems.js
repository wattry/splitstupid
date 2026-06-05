/**
 * Parse a free-text field of space-separated prices into a clean number array.
 * - splits on any whitespace
 * - strips a single leading "$"
 * - drops anything that is not a finite, non-negative number
 *
 * @param {string} text
 * @returns {number[]}
 */
export function parseItems(text) {
  if (!text) return []
  return text
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => Number(token.replace(/^\$/, '')))
    .filter((n) => Number.isFinite(n) && n >= 0)
}
