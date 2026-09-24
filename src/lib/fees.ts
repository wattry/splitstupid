/**
 * Itemised taxes and fees. The "Total Taxes & Fees" input is a view over this
 * list: with zero or one fee it edits that fee directly, with several it shows
 * the sum and the popover holds the breakdown.
 */
import type { Fee } from '../types.js';

const amountOf = (fee: Fee) => parseFloat(fee.amount) || 0;

/** Whole-bill taxes + fees as a number. Blank or unparsable amounts count 0. */
export function feeTotal(fees: Fee[]): number {
  return fees.reduce((sum, fee) => sum + amountOf(fee), 0);
}

/**
 * What the total input shows. The raw string with at most one fee so the
 * controlled input round-trips half-typed values; a fixed-2 sum otherwise.
 */
export function feeInputValue(fees: Fee[]): string {
  if (fees.length === 0) return '';
  if (fees.length === 1) return fees[0]!.amount;
  return feeTotal(fees).toFixed(2);
}

/** True when the total is built from more than one non-zero fee. */
export function isItemised(fees: Fee[]): boolean {
  return fees.filter((fee) => amountOf(fee) > 0).length > 1;
}

export function makeFee(fields: Partial<Omit<Fee, 'id'>> = {}): Fee {
  return { id: crypto.randomUUID(), label: '', amount: '', ...fields };
}

/** Typing straight into the total replaces the breakdown with one "Tax" fee. */
export function collapseFees(typed: string): Fee[] {
  return typed === '' ? [] : [makeFee({ label: 'Tax', amount: typed })];
}

/** Drop rows the user left empty in both fields. */
export function pruneBlankFees(fees: Fee[]): Fee[] {
  return fees.filter((fee) => fee.label.trim() !== '' || fee.amount !== '');
}

/** Analytics properties describing the fee list. */
export function feeSummary(fees: Fee[]): { fee_count: number; labeled_count: number; total: number } {
  const live = pruneBlankFees(fees);
  return {
    fee_count: live.length,
    labeled_count: live.filter((fee) => fee.label.trim() !== '').length,
    total: feeTotal(live),
  };
}

/** Type guard for a fee list read from an untrusted save file. */
export function isFeeList(value: unknown): value is Fee[] {
  return (
    Array.isArray(value) &&
    value.every(
      (fee) => typeof fee === 'object' && fee !== null &&
        typeof (fee as Fee).id === 'string' &&
        typeof (fee as Fee).label === 'string' &&
        typeof (fee as Fee).amount === 'string'
    )
  );
}
