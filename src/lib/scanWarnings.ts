import type { ParsedLineItem, ParsedTotals } from '../types.js';

const money = (n: number) => `$${n.toFixed(2)}`;
const cents = (n: number) => Math.round(n * 100);

/**
 * Sanity checks on a freshly scanned receipt, comparing receipt numbers to
 * receipt numbers. Runs only when the receipt printed both figures it
 * compares, and tolerates a one cent rounding difference.
 *
 * Whether the line items add up to the subtotal is not checked here: that is
 * tracked live against the form by `reconcile()` so it follows later edits.
 *
 * @returns human-readable warnings, empty when everything adds up
 */
export function scanWarnings(totals: ParsedTotals, _items: ParsedLineItem[]): string[] {
  const warnings: string[] = [];

  if (totals.subtotal !== undefined && totals.total !== undefined) {
    const expected = totals.subtotal + (totals.tax ?? 0) + (totals.tip ?? 0);
    if (Math.abs(cents(expected) - cents(totals.total)) > 1) {
      warnings.push(
        `Subtotal + tax + tip is ${money(expected)} but the receipt says total ${money(totals.total)}. Tax, fees or tip may be missing.`
      );
    }
  }

  return warnings;
}
