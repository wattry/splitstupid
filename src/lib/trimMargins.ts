/**
 * Find the bright (receipt paper) region of a grayscale image so the darker
 * table/background around it can be trimmed before OCR.
 *
 * Works on per-column and per-row mean brightness: the receipt is a bright
 * band, the surroundings are darker. Printed text rows dent the row means but
 * don't affect the outer edges, which is all we look for.
 */

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TrimOptions {
  /** Pixels of margin to keep around the bright region. */
  pad?: number;
  /**
   * Smallest fraction of the image (per axis) the bright region may be before
   * we give up and return the full image — guards against trimming to a
   * highlight when the receipt/background contrast is poor.
   */
  minFraction?: number;
}

const DEFAULT_PAD = 8;
const DEFAULT_MIN_FRACTION = 0.4;

/**
 * @param gray one byte per pixel, row-major
 * @param width image width in px
 * @param height image height in px
 * @param opts
 * @returns crop rectangle in source pixels
 */
export function findBrightBounds(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  opts: TrimOptions = {}
): Bounds {
  const { pad = DEFAULT_PAD, minFraction = DEFAULT_MIN_FRACTION } = opts;
  const full: Bounds = { x: 0, y: 0, width, height };
  if (width === 0 || height === 0) return full;

  const colSum = new Float64Array(width);
  const rowSum = new Float64Array(height);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const v = gray[row + x] ?? 0;
      colSum[x] = (colSum[x] ?? 0) + v;
      rowSum[y] = (rowSum[y] ?? 0) + v;
    }
  }
  const colMean = Array.from(colSum, (s) => s / height);
  const rowMean = Array.from(rowSum, (s) => s / width);

  const [x0, x1] = brightSpan(colMean);
  const [y0, y1] = brightSpan(rowMean);

  if (x1 - x0 < width * minFraction || y1 - y0 < height * minFraction) return full;

  const x = Math.max(0, x0 - pad);
  const y = Math.max(0, y0 - pad);
  return {
    x,
    y,
    width: Math.min(width, x1 + pad) - x,
    height: Math.min(height, y1 + pad) - y,
  };
}

/** First and one-past-last index whose mean is at or above the midpoint. */
function brightSpan(means: number[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const m of means) {
    if (m < min) min = m;
    if (m > max) max = m;
  }
  const threshold = (min + max) / 2;
  let start = 0;
  while (start < means.length && (means[start] ?? 0) < threshold) start += 1;
  let end = means.length;
  while (end > start && (means[end - 1] ?? 0) < threshold) end -= 1;
  return [start, end];
}
