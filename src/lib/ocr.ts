/**
 * Thin wrapper around tesseract.js for reading a receipt image in-browser.
 *
 * tesseract.js (engine wasm + English language data) is large, so it's
 * dynamically imported here — it only loads on the first scan, keeping it out
 * of the main app bundle. The wasm/lang assets are fetched from the
 * tesseract.js CDN at runtime (needs network on first use).
 *
 * Receipt OCR accuracy is improved two ways:
 *   1. Preprocessing — upscale small images, grayscale, trim the dark
 *      table/background around the receipt, then a percentile contrast
 *      stretch and gamma lift (see enhance.ts) so paper goes white and ink
 *      stays black.
 *   2. Engine params — treat the image as one ragged column of text (PSM 4) at
 *      a fixed 300 DPI. A/B tested against PSM 6 on real receipt photos:
 *      PSM 6 reads the table surface around the receipt as garbage tokens;
 *      PSM 4 tracks the receipt column cleanly. A character whitelist drops
 *      glyphs that can't appear on a receipt (smart quotes, brackets).
 */

import { findBrightBounds } from './trimMargins.js';
import { enhanceGray } from './enhance.js';
import { pickBestText } from './ocrScore.js';

// Upscale anything narrower than this (px) — tesseract wants ~300 DPI text.

const MIN_WIDTH = 1500 as const;

// Characters a receipt can plausibly contain — everything else is OCR noise.
// ":" matters: without it "7:08 PM" reads as "7.08", which looks like a price.
// "£" matters too: with it missing, tesseract forces "£3.75" into the nearest
// allowed glyphs and mangles the digits next to it ("$3.7h"), losing the line.
const CHAR_WHITELIST =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$£.,':/#&- ";

type Image = File | Blob | string;

interface ScanReceiptOptions {
  onProgress: (progress: number) => void;
  onPreview: (dataUrl: string) => void;
};

/**
 * OCR a receipt image into raw text.
 *
 * @param image the cropped image (or an image URL)
 * @param opts
 *        as a JPEG data URL, emitted right after preprocessing
 * @returns {Promise<string>} raw recognized text
 */
export async function scanReceipt(image: File | Blob | string, opts: ScanReceiptOptions): Promise<string> {
  const { onProgress, onPreview } = opts;
  const { createWorker, PSM } = await import('tesseract.js');

  const prepared = await preprocess(image);
  if (typeof onPreview === 'function') {
    onPreview(prepared.toDataURL('image/jpeg', 0.9));
  }

  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof onProgress === 'function') {
        onProgress(m.progress);
      }
    },
  });

  try {
    await worker.setParameters({
      user_defined_dpi: '300',
      preserve_interword_spaces: '1',
      tessedit_char_whitelist: CHAR_WHITELIST,
    });
    // Two segmentation passes, best one wins (see ocrScore.ts): SINGLE_COLUMN
    // copes with background around the receipt but can drop a right-hand
    // price column; SINGLE_BLOCK keeps every column but reads background
    // texture as words.
    const passes: string[] = [];
    for (const mode of [PSM.SINGLE_COLUMN, PSM.SINGLE_BLOCK]) {
      await worker.setParameters({ tessedit_pageseg_mode: mode });
      const { data } = await worker.recognize(prepared);
      passes.push(data.text);
    }
    return pickBestText(passes);
  } finally {
    await worker.terminate();
  }
}

/**
 * Clean up a receipt image for OCR: upscale if small, grayscale, trim dark
 * margins around the receipt, then stretch contrast and lift exposure.
 * Returns a canvas tesseract can read directly.
 *
 * Order matters: margins are found on the full grayscale image, then the
 * enhancement runs on the trimmed region only, so a dark table doesn't
 * dominate the histogram and wash out faint print.
 *
 * @param image
 * @returns A promise containing a canvas element
 */
async function preprocess(image: Image): Promise<HTMLCanvasElement> {
  const src = typeof image === 'string' ? image : URL.createObjectURL(image);
  try {
    const img = await loadImage(src);

    const scale = img.naturalWidth < MIN_WIDTH ? MIN_WIDTH / img.naturalWidth : 1;
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get a 2D canvas context');
    ctx.drawImage(img, 0, 0, width, height);

    const gray = toGray(ctx.getImageData(0, 0, width, height).data);
    const bounds = findBrightBounds(gray, width, height);

    const out = document.createElement('canvas');
    out.width = bounds.width;
    out.height = bounds.height;
    const outCtx = out.getContext('2d');
    if (!outCtx) throw new Error('Could not get a 2D canvas context');

    const pixels = ctx.getImageData(bounds.x, bounds.y, bounds.width, bounds.height);
    writeGray(pixels.data, enhanceGray(toGray(pixels.data)));
    outCtx.putImageData(pixels, 0, 0);

    return out;
  } finally {
    if (typeof image !== 'string') URL.revokeObjectURL(src);
  }
}

/**
 * Rec. 601 luma of RGBA pixel data, one byte per pixel.
 *
 * @param data
 */
function toGray(data: Uint8ClampedArray): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(data.length / 4);
  for (let i = 0, g = 0; i < data.length; i += 4, g++) {
    gray[g] = ((data[i] ?? 0) * 0.299 + (data[i + 1] ?? 0) * 0.587 + (data[i + 2] ?? 0) * 0.114) | 0;
  }
  return gray;
}

/**
 * Write one-byte-per-pixel gray values back into RGBA pixel data in place.
 *
 * @param data RGBA destination
 * @param gray source, one byte per pixel
 */
function writeGray(data: Uint8ClampedArray, gray: Uint8ClampedArray) {
  for (let i = 0, g = 0; i < data.length; i += 4, g++) {
    data[i] = data[i + 1] = data[i + 2] = gray[g] ?? 0;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
