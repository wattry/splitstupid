import type { Item } from '../types.js';

export type ReconcileStatus = 'balanced' | 'off' | 'unknown';

export interface Reconciliation {
  /** Sum of every row's full line total (the Mine column plays no part). */
  lineSum: number;
  /** The Sub Total field as a number, or undefined when blank/unparseable. */
  subtotal: number | undefined;
  /** lineSum - subtotal, undefined when subtotal is unknown. */
  diff: number | undefined;
  status: ReconcileStatus;
}

const num = (s: string) => parseFloat(s) || 0;
const cents = (n: number) => Math.round(n * 100);

/**
 * Full value of a row as printed on the receipt: what all `units` cost, not
 * just the user's share.
 *  - total mode:    price is already the line total
 *  - per-unit mode: units × price
 */
export function lineTotal(item: Item, perUnit: boolean): number {
  const price = num(item.price);
  return perUnit ? num(item.units) * price : price;
}

/**
 * Compare the rows' full line totals with the Sub Total the user entered (or
 * the scan found). Tolerates a one cent rounding difference, matching the
 * scan-time sanity checks.
 */
export function reconcile(items: Item[], perUnit: boolean, billSubtotal: string): Reconciliation {
  const lineSum = items.reduce((sum, item) => sum + lineTotal(item, perUnit), 0);
  const parsed = parseFloat(billSubtotal);
  if (billSubtotal.trim() === '' || Number.isNaN(parsed)) {
    return { lineSum, subtotal: undefined, diff: undefined, status: 'unknown' };
  }
  const diff = lineSum - parsed;
  const status: ReconcileStatus = Math.abs(cents(lineSum) - cents(parsed)) <= 1 ? 'balanced' : 'off';
  return { lineSum, subtotal: parsed, diff, status };
}

const money = (n: number) => `$${Math.abs(n).toFixed(2)}`;

/** One-line status for the reconcile row under the line items. */
export function reconcileMessage(r: Reconciliation): string {
  const items = `Line items ${money(r.lineSum)}`;
  if (r.status === 'unknown' || r.subtotal === undefined || r.diff === undefined) {
    return `${items} · enter Sub Total to check`;
  }
  if (r.status === 'balanced') return `${items} match Sub Total`;
  const direction = r.diff < 0 ? 'under' : 'over';
  return `${items} · Sub Total ${money(r.subtotal)} · ${money(r.diff)} ${direction}`;
}
