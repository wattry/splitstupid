import { describe, it, expect } from 'vitest';
import { calculate } from '../../src/lib/calculate.js';

describe('calculate', () => {
  it('applies the whole-bill tax ratio to the user share', () => {
    // bill subtotal 200, tax 20 => 10% tax rate. User share 100 => 10 tax.
    const r = calculate({ items: [60, 40], billSubtotal: 200, totalTax: 20 });
    expect(r.subtotal).toBe(100);
    expect(r.taxAmt).toBe(10);
    expect(r.afterTax).toBe(110);
  });

  it('applies the whole-bill tip ratio to the user share', () => {
    // bill subtotal 200, tip 40 => 20% tip rate. User share 100 => 20 tip.
    const r = calculate({ items: [100], billSubtotal: 200, tipAmt: 40 });
    expect(r.tipAmt).toBe(20);
    expect(r.total).toBe(120);
  });

  it('combines tax and tip ratios', () => {
    const r = calculate({ items: [100], billSubtotal: 200, totalTax: 20, tipAmt: 40 });
    expect(r.taxAmt).toBe(10);
    expect(r.tipAmt).toBe(20);
    expect(r.total).toBe(130);
  });

  it('treats a zero/missing bill subtotal as no tax or tip', () => {
    const r = calculate({ items: [50], totalTax: 5, tipAmt: 10 });
    expect(r.taxAmt).toBe(0);
    expect(r.tipAmt).toBe(0);
    expect(r.total).toBe(50);
  });

  it('returns all zeros for empty items', () => {
    const r = calculate({ items: [], billSubtotal: 200, totalTax: 20, tipAmt: 40 });
    expect(r.subtotal).toBe(0);
    expect(r.taxAmt).toBe(0);
    expect(r.tipAmt).toBe(0);
    expect(r.afterTax).toBe(0);
    expect(r.total).toBe(0);
  });
});

describe('calculate with split even', () => {
  it('divides the line-item sum by party size and multiplies by my party', () => {
    // items sum 200 split 4 ways, 2 in my party => 100 subtotal.
    // bill subtotal 200, tax 20 => 10, tip 40 => 20.
    const r = calculate({
      items: [150, 50],
      billSubtotal: 200,
      totalTax: 20,
      tipAmt: 40,
      split: { partySize: 4, myParty: 2 },
    });
    expect(r.subtotal).toBe(100);
    expect(r.taxAmt).toBe(10);
    expect(r.tipAmt).toBe(20);
    expect(r.total).toBe(130);
  });

  it('uses the bill subtotal only for tax and tip ratios, not the split base', () => {
    // items 100, bill subtotal 400 (best guess) => split base is still 100.
    const r = calculate({ items: [100], billSubtotal: 400, totalTax: 40, split: { partySize: 2, myParty: 1 } });
    expect(r.subtotal).toBe(50);
    expect(r.taxAmt).toBe(5);
  });

  it('falls back to plain line-item math when party size is zero or invalid', () => {
    expect(calculate({ items: [30], billSubtotal: 100, split: { partySize: 0, myParty: 1 } }).subtotal).toBe(30);
    expect(calculate({ items: [30], billSubtotal: 100, split: { partySize: NaN, myParty: 1 } }).subtotal).toBe(30);
  });

  it('treats an invalid my party as zero', () => {
    const r = calculate({ items: [30], billSubtotal: 100, split: { partySize: 2, myParty: NaN } });
    expect(r.subtotal).toBe(0);
  });
});
