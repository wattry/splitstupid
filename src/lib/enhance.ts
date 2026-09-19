/**
 * Automatic contrast and exposure boost for receipt photos.
 *
 * Receipts are dark ink on pale paper, so pushing the paper to white and the
 * ink to black is almost always safe. Two steps, no user-facing knobs:
 *
 *   1. Percentile stretch — map the `lowPct` percentile to 0 and the `highPct`
 *      percentile to 255, clipping outside. Unlike a min/max stretch this is
 *      not defeated by a single dust speck or glare pixel.
 *   2. Gamma — values below 1 lift midtones, so slightly gray paper becomes
 *      white while ink stays dark.
 */

export interface EnhanceOptions {
  /** Percentile (0..100) mapped to black. */
  lowPct: number;
  /** Percentile (0..100) mapped to white. */
  highPct: number;
  /** Gamma exponent; < 1 brightens, > 1 darkens, 1 is linear. */
  gamma: number;
}

export const DEFAULT_ENHANCE: EnhanceOptions = { lowPct: 2, highPct: 98, gamma: 0.8 };

/**
 * Return a contrast-stretched, gamma-corrected copy of a grayscale buffer.
 *
 * @param gray one byte per pixel
 * @param opts overrides for the defaults
 */
export function enhanceGray(
  gray: Uint8ClampedArray,
  opts: Partial<EnhanceOptions> = {}
): Uint8ClampedArray {
  const { lowPct, highPct, gamma } = { ...DEFAULT_ENHANCE, ...opts };
  const out = new Uint8ClampedArray(gray.length);
  if (gray.length === 0) return out;

  const hist = new Uint32Array(256);
  for (const v of gray) hist[v] = (hist[v] ?? 0) + 1;

  const low = percentile(hist, gray.length, lowPct);
  const high = percentile(hist, gray.length, highPct);
  const range = high - low || 1;

  // 256-entry lookup: stretch then gamma, once per possible value.
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    const t = Math.min(1, Math.max(0, (v - low) / range));
    lut[v] = Math.round(Math.pow(t, gamma) * 255);
  }

  for (let i = 0; i < gray.length; i++) out[i] = lut[gray[i] ?? 0] ?? 0;
  return out;
}

/** Smallest value whose cumulative count reaches `pct` percent of `total`. */
function percentile(hist: Uint32Array, total: number, pct: number): number {
  const target = (total * pct) / 100;
  let cum = 0;
  for (let v = 0; v < 256; v++) {
    cum += hist[v] ?? 0;
    if (cum >= target) return v;
  }
  return 255;
}
