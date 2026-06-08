/**
 * Thin wrapper around tesseract.js for reading a receipt image in-browser.
 *
 * tesseract.js (engine wasm + English language data) is large, so it's
 * dynamically imported here — it only loads on the first scan, keeping it out
 * of the main app bundle. The wasm/lang assets are fetched from the
 * tesseract.js CDN at runtime (needs network on first use).
 *
 * Receipt OCR accuracy is improved two ways:
 *   1. Preprocessing — upscale small images, grayscale, boost contrast.
 *   2. Engine params — treat the image as one uniform text block (PSM 6) at a
 *      fixed 300 DPI, which suits receipts better than the default auto mode.
 */

// Upscale anything narrower than this (px) — tesseract wants ~300 DPI text.

const MIN_WIDTH = 1500 as const;

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
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK, // '6' — one uniform block of text
      user_defined_dpi: '300',
    });
    const { data } = await worker.recognize(prepared);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

/**
 * Clean up a receipt image for OCR: upscale if small, grayscale, and stretch
 * contrast. Returns a canvas tesseract can read directly.
 *
 * @param image
 * @returns A promise containing an image element
 */
async function preprocess(image: Image): Promise<HTMLCanvasElement> {
  const src = typeof image === 'string' ? image : URL.createObjectURL(image);
  try {
    const img = await loadImage(src);

    const scale = img.naturalWidth < MIN_WIDTH ? MIN_WIDTH / img.naturalWidth : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get a 2D canvas context');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    grayscaleAndStretch(pixels.data);
    ctx.putImageData(pixels, 0, 0);

    return canvas;
  } finally {
    if (typeof image !== 'string') URL.revokeObjectURL(src);
  }
}

/**
 * In-place grayscale + contrast stretch on RGBA pixel data. Maps the darkest
 * pixel to 0 and the lightest to 255 so faint receipt print gets pushed toward
 * solid black-on-white without a hard threshold (which can erase weak text).
 *
 * @param data
 */
function grayscaleAndStretch(data: Uint8ClampedArray) {
  if (data instanceof Uint8ClampedArray) {
    let min = 255;
    let max = 0;
    const gray = new Uint8ClampedArray(data.length / 4);

    for (let i = 0, g = 0; i < data.length; i += 4, g++) {
      // Rec. 601 luma.
      const lum = ((data[i] ?? 0) * 0.299 + (data[i + 1] ?? 0) * 0.587 + (data[i + 2] ?? 0) * 0.114) | 0;
      gray[g] = lum;
      if (lum < min) min = lum;
      if (lum > max) max = lum;
    }

    const range = max - min || 1;
    for (let i = 0, g = 0; i < data.length; i += 4, g++) {
      const v = (((gray[g] ?? 0) - min) * 255) / range;

      data[i] = data[i + 1] = data[i + 2] = v;
    }
  } else {
    throw new Error();
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
