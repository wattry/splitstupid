import { describe, it, expect } from 'vitest';
import { calculate } from '../../src/lib/calculate.js';

describe('calculate', () => {
  it('applies the whole-bill tax ratio to the user share', () => {
    // bill subtotal 200, tax 20 => 10% tax rate. User share 100 => 10 tax.
    const r = calculate({ items: [60, 40], billSubtotal: 200, totalTax: 20 })
    expect(r.subtotal).toBe(100)
    expect(r.taxAmt).toBe(10)
    expect(r.afterTax).toBe(110)
  })

  it('applies the whole-bill tip ratio to the user share', () => {
    // bill subtotal 200, tip 40 => 20% tip rate. User share 100 => 20 tip.
    const r = calculate({ items: [100], billSubtotal: 200, tipAmt: 40 })
    expect(r.tipAmt).toBe(20)
    expect(r.effectiveTip).toBeCloseTo(0.2)
    expect(r.total).toBe(120)
  })

  it('combines tax and tip ratios', () => {
    const r = calculate({ items: [100], billSubtotal: 200, totalTax: 20, tipAmt: 40 })
    expect(r.taxAmt).toBe(10)
    expect(r.tipAmt).toBe(20)
    expect(r.total).toBe(130)
  })

  it('treats a zero/missing bill subtotal as no tax or tip', () => {
    const r = calculate({ items: [50], totalTax: 5, tipAmt: 10 })
    expect(r.taxAmt).toBe(0)
    expect(r.tipAmt).toBe(0)
    expect(r.total).toBe(50)
  })

  it('returns all zeros for empty items', () => {
    const r = calculate({ items: [], billSubtotal: 200, totalTax: 20, tipAmt: 40 })
    expect(r.subtotal).toBe(0)
    expect(r.taxAmt).toBe(0)
    expect(r.tipAmt).toBe(0)
    expect(r.afterTax).toBe(0)
    expect(r.total).toBe(0)
  })
})
