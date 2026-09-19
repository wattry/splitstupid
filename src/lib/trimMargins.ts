/**
 * Find the bright (receipt paper) region of a grayscale image so the darker
 * table/background around it can be trimmed before OCR.
 *
 * Works on the fraction of paper-bright pixels per column and per row: the
 * receipt is a band where most pixels are paper, the surroundings are dark
 * throughout. Counting pixels rather than averaging brightness means a row of
 * dense print (still mostly paper between the glyphs) is never mistaken for
 * background, so text on the first or last line of a tight crop survives.
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
/** A row/column counts as paper when at least this share of its pixels are bright. */
const PAPER_SHARE = 0.25;

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

  // Paper vs. not: midpoint between the darkest and brightest pixel values.
  let min = 255;
  let max = 0;
  for (const v of gray) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const bright = (min + max) / 2;

  const colCount = new Uint32Array(width);
  const rowCount = new Uint32Array(height);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if ((gray[row + x] ?? 0) >= bright) {
        colCount[x] = (colCount[x] ?? 0) + 1;
        rowCount[y] = (rowCount[y] ?? 0) + 1;
      }
    }
  }
  const colShare = Array.from(colCount, (c) => c / height);
  const rowShare = Array.from(rowCount, (c) => c / width);

  const [x0, x1] = paperSpan(colShare);
  const [y0, y1] = paperSpan(rowShare);

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

/** First and one-past-last index whose paper share reaches PAPER_SHARE. */
function paperSpan(shares: number[]): [number, number] {
  let start = 0;
  while (start < shares.length && (shares[start] ?? 0) < PAPER_SHARE) start += 1;
  let end = shares.length;
  while (end > start && (shares[end - 1] ?? 0) < PAPER_SHARE) end -= 1;
  return [start, end];
}
