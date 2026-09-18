import type { ParsedLineItem, ParsedTotals } from '../types.js';

const money = (n: number) => `$${n.toFixed(2)}`;
const cents = (n: number) => Math.round(n * 100);

/**
 * Sanity checks on a freshly scanned receipt, comparing receipt numbers to
 * receipt numbers. Each check runs only when the receipt printed the figure it
 * compares against, and tolerates a one cent rounding difference.
 *
 * @returns human-readable warnings, empty when everything adds up
 */
export function scanWarnings(totals: ParsedTotals, items: ParsedLineItem[]): string[] {
  const warnings: string[] = [];

  if (totals.subtotal !== undefined) {
    const lineSum = items.reduce((sum, { lineTotal }) => sum + lineTotal, 0);
    if (Math.abs(cents(lineSum) - cents(totals.subtotal)) > 1) {
      warnings.push(
        `Line items add up to ${money(lineSum)} but the receipt says subtotal ${money(totals.subtotal)}. A line may have been misread.`
      );
    }

    if (totals.total !== undefined) {
      const expected = totals.subtotal + (totals.tax ?? 0) + (totals.tip ?? 0);
      if (Math.abs(cents(expected) - cents(totals.total)) > 1) {
        warnings.push(
          `Subtotal + tax + tip is ${money(expected)} but the receipt says total ${money(totals.total)}. Tax, fees or tip may be missing.`
        );
      }
    }
  }

  return warnings;
}
