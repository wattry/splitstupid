import type { Area } from 'react-easy-crop';
import { parseLineItems } from './parseLineItems.js';
import { parseTotals } from './parseTotals.js';
import { scanReceipt } from './ocr.js';
import { getCroppedBlob } from './cropImage.js';
import type { ParsedLineItem, ParsedTotals } from '../types.js';

const TOTAL_KEYS = ['subtotal', 'tax', 'tip', 'total'] as const;

export interface MergedScan {
  totals: ParsedTotals;
  items: ParsedLineItem[];
}

/**
 * Combine the OCR text of several photos of one bill.
 *
 * Line items are concatenated in photo order. Each totals field comes from
 * the first photo whose text names it, so a card slip photographed after the
 * itemised page fills in tax/tip without overriding an earlier subtotal.
 */
export function mergeScans(texts: string[]): MergedScan {
  const totals: ParsedTotals = {};
  const items: ParsedLineItem[] = [];

  for (const text of texts) {
    items.push(...parseLineItems(text));
    const found = parseTotals(text);
    for (const key of TOTAL_KEYS) {
      if (totals[key] === undefined && found[key] !== undefined) {
        totals[key] = found[key];
      }
    }
  }

  return { totals, items };
}

export interface PhotoInput {
  /** Object URL of the original photo. */
  src: string;
  /** Optional crop rectangle in source pixels; whole image when absent. */
  area?: Area;
}

export interface ScanPhotosHooks {
  /** Called with the photo index (0-based) and that photo's OCR fraction 0..1. */
  onProgress: (index: number, fraction: number) => void;
  /** Preprocessed image for the photo currently being scanned. */
  onPreview: (dataUrl: string) => void;
}

export type ScanFn = (
  image: Blob | string,
  opts: { onProgress: (p: number) => void; onPreview: (dataUrl: string) => void }
) => Promise<string>;

/**
 * OCR each photo in order, cropping first when a crop area is set.
 *
 * Runs sequentially: tesseract holds one worker, and the progress UI reads
 * "Scanning 2 of 5". Rejects on the first photo that fails.
 *
 * @param scan OCR function; defaults to the tesseract-backed scanReceipt,
 *        injectable so tests avoid loading wasm.
 */
export async function scanPhotos(
  inputs: PhotoInput[],
  hooks: ScanPhotosHooks,
  scan: ScanFn = scanReceipt
): Promise<string[]> {
  const texts: string[] = [];
  for (let i = 0; i < inputs.length; i++) {
    const { src, area } = inputs[i] as PhotoInput;
    hooks.onProgress(i, 0);
    let image: Blob | string = src;
    if (area) {
      const cropped = await getCroppedBlob(src, area);
      if (!cropped) throw new Error(`Could not crop photo ${i + 1}`);
      image = cropped;
    }
    const text = await scan(image, {
      onProgress: (p) => hooks.onProgress(i, p),
      onPreview: hooks.onPreview,
    });
    texts.push(text);
  }
  return texts;
}

/**
 * The raw OCR text of every photo as one copyable document. Whitespace is
 * kept verbatim so the receipt's columns still line up in a monospace view;
 * several photos are separated by a labelled divider line.
 */
export function joinScanTexts(texts: string[]): string {
  if (texts.length <= 1) return texts[0] ?? '';
  return texts
    .map((text, i) => `--- Photo ${i + 1} of ${texts.length} ---\n${text}`)
    .join('\n\n');
}

const PHOTO_DIVIDER = /^--- Photo \d+ of \d+ ---$/m;

/**
 * Inverse of joinScanTexts, for text the user has edited: split it back into
 * per-photo texts on the divider lines so totals still merge photo by photo.
 * Text without dividers is one photo; empty sections are dropped.
 */
export function splitScanTexts(text: string): string[] {
  return text
    .split(PHOTO_DIVIDER)
    .map((part) => part.replace(/^\n+|\n+$/g, ''))
    .filter((part) => part.trim().length > 0);
}
