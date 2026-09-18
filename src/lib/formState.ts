import type { Item, MakeRow, ParsedTotals } from '../types.js';

/** Every bill-level form field that a receipt scan replaces wholesale. */
export interface BillState {
  billName: string;
  billSubtotal: string;
  totalTax: string;
  hasFees: boolean;
  tipAmount: string;
  splitEven: boolean;
  partySize: string;
  myParty: string;
  items: Item[];
}

const blankFields = (): Omit<BillState, 'items'> => ({
  billName: '',
  billSubtotal: '',
  totalTax: '',
  hasFees: false,
  tipAmount: '',
  splitEven: false,
  partySize: '4',
  myParty: '2',
});

/** A blank bill: the state the app starts in. */
export function initialBill(makeRow: MakeRow): BillState {
  return { ...blankFields(), items: [makeRow()] };
}

const money = (n: number | undefined) => (n === undefined ? '' : String(n));

/**
 * The bill to show after a receipt scan. Built from a blank bill so nothing
 * the user typed for a previous receipt survives; totals the scan didn't find
 * are left blank rather than inherited.
 */
export function scannedBill(totals: ParsedTotals, items: Item[]): BillState {
  return {
    ...blankFields(),
    billSubtotal: money(totals.subtotal),
    totalTax: money(totals.tax),
    tipAmount: money(totals.tip),
    items,
  };
}
