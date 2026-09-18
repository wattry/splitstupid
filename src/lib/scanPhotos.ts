import { parseLineItems } from './parseLineItems.js';
import { parseTotals } from './parseTotals.js';
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
