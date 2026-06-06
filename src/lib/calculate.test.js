import { describe, it, expect } from 'vitest'
import { calculate } from './calculate.js'

describe('calculate', () => {
  it('applies tip on the pre-tax subtotal (Fair Mark Value)', () => {
    const r = calculate({ items: [60, 40], stateTax: 10, tipPct: 20, preTax: true })
    expect(r.subtotal).toBe(100)
    expect(r.taxAmt).toBe(10)
    expect(r.tipAmt).toBe(20)
    expect(r.total).toBe(130)
  })

  it('applies tip on the post-tax amount (Oh we got duped again)', () => {
    const r = calculate({ items: [100], stateTax: 10, tipPct: 20, preTax: false })
    expect(r.subtotal).toBe(100)
    expect(r.taxAmt).toBe(10)
    expect(r.tipAmt).toBe(22)
    expect(r.total).toBe(132)
  })

  it('treats a null tipPct (WTF) as zero tip', () => {
    const r = calculate({ items: [50], stateTax: 8, tipPct: null, preTax: true })
    expect(r.tipAmt).toBe(0)
    expect(r.subtotal).toBe(50)
    expect(r.taxAmt).toBe(4)
    expect(r.total).toBe(54)
  })

  it('returns all zeros for empty items', () => {
    const r = calculate({ items: [], stateTax: 10, tipPct: 20, preTax: true })
    expect(r.subtotal).toBe(0)
    expect(r.taxAmt).toBe(0)
    expect(r.localTaxAmt).toBe(0)
    expect(r.tipAmt).toBe(0)
    expect(r.afterTax).toBe(0)
    expect(r.total).toBe(0)
  })

  it('treats a missing/NaN stateTax as 0%', () => {
    const r = calculate({ items: [100], stateTax: NaN, tipPct: 10, preTax: true })
    expect(r.taxAmt).toBe(0)
    expect(r.tipAmt).toBe(10)
    expect(r.total).toBe(110)
  })
})
