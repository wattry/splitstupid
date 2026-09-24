import { describe, it, expect } from 'vitest';
import {
  feeTotal, feeInputValue, isItemised, collapseFees, makeFee, pruneBlankFees, feeSummary, isFeeList,
} from '../../src/lib/fees.js';
import type { Fee } from '../../src/types.js';

const fee = (label: string, amount: string): Fee => ({ id: label + amount, label, amount });

describe('feeTotal', () => {
  it('sums numeric amounts and ignores blanks/garbage', () => {
    expect(feeTotal([fee('Tax', '1.50'), fee('Svc', ''), fee('x', 'abc'), fee('Fee', '2')])).toBe(3.5);
  });
  it('is 0 for no fees', () => {
    expect(feeTotal([])).toBe(0);
  });
});

describe('feeInputValue', () => {
  it('is blank with no fees', () => {
    expect(feeInputValue([])).toBe('');
  });
  it('is the raw amount string when there is one fee so typing round-trips', () => {
    expect(feeInputValue([fee('Tax', '3.')])).toBe('3.');
  });
  it('is the fixed-2 sum when there are several fees', () => {
    expect(feeInputValue([fee('Tax', '1.5'), fee('Svc', '2')])).toBe('3.50');
  });
});

describe('isItemised', () => {
  it('is true only with more than one non-zero fee', () => {
    expect(isItemised([fee('Tax', '1'), fee('Svc', '2')])).toBe(true);
    expect(isItemised([fee('Tax', '1'), fee('Svc', '')])).toBe(false);
    expect(isItemised([fee('Tax', '1')])).toBe(false);
    expect(isItemised([])).toBe(false);
  });
});

describe('collapseFees', () => {
  it('turns a typed total into a single Tax fee', () => {
    const fees = collapseFees('4.2');
    expect(fees).toHaveLength(1);
    expect(fees[0]).toMatchObject({ label: 'Tax', amount: '4.2' });
    expect(fees[0]!.id).toBeTruthy();
  });
  it('turns a blank typed total into no fees', () => {
    expect(collapseFees('')).toEqual([]);
  });
});

describe('makeFee', () => {
  it('builds a blank fee with a fresh id', () => {
    const a = makeFee();
    const b = makeFee();
    expect(a).toMatchObject({ label: '', amount: '' });
    expect(a.id).not.toBe(b.id);
  });
  it('prefills label and amount', () => {
    expect(makeFee({ label: 'Tax', amount: '1' })).toMatchObject({ label: 'Tax', amount: '1' });
  });
});

describe('pruneBlankFees', () => {
  it('drops rows blank in both label and amount', () => {
    const keep = fee('Tax', '1');
    const named = fee('Svc', '');
    expect(pruneBlankFees([keep, fee('', ''), named, fee('  ', '')])).toEqual([keep, named]);
  });
});

describe('feeSummary', () => {
  it('reports counts and total for analytics', () => {
    expect(feeSummary([fee('Tax', '1.5'), fee('', '2'), fee('', '')])).toEqual({
      fee_count: 2,
      labeled_count: 1,
      total: 3.5,
    });
  });
});

describe('isFeeList', () => {
  it('accepts an array of fees from a save file', () => {
    expect(isFeeList([{ id: 'a', label: 'Tax', amount: '1' }])).toBe(true);
    expect(isFeeList([])).toBe(true);
  });
  it('rejects anything else', () => {
    expect(isFeeList(undefined)).toBe(false);
    expect(isFeeList('1')).toBe(false);
    expect(isFeeList([{ id: 'a', label: 'Tax', amount: 1 }])).toBe(false);
    expect(isFeeList([{ label: 'Tax', amount: '1' }])).toBe(false);
  });
});
