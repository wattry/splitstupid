import type { Fee, Item, MakeRow, ParsedTotals } from '../types.js';
import { makeFee } from './fees.js';

/** Every bill-level form field that a receipt scan replaces wholesale. */
export interface BillState {
  billName: string;
  billSubtotal: string;
  /** Itemised taxes and fees; the total input is derived from these. */
  fees: Fee[];
  tipAmount: string;
  splitEven: boolean;
  partySize: string;
  myParty: string;
  items: Item[];
}

const blankFields = (): Omit<BillState, 'items' | 'fees'> => ({
  billName: '',
  billSubtotal: '',
  tipAmount: '',
  splitEven: false,
  partySize: '4',
  myParty: '2',
});

/** A blank bill: the state the app starts in. */
export function initialBill(makeRow: MakeRow): BillState {
  return { ...blankFields(), fees: [], items: [makeRow()] };
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
    fees: totals.tax === undefined ? [] : [makeFee({ label: 'Tax', amount: money(totals.tax) })],
    tipAmount: money(totals.tip),
    items,
  };
}
