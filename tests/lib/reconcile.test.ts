import { describe, it, expect } from 'vitest'
import { lineTotal, reconcile, reconcileMessage } from '../../src/lib/reconcile.js'
import type { Item } from '../../src/types.js'

const row = (units: string, price: string, yours = units): Item =>
  ({ id: crypto.randomUUID(), units, yours, desc: 'x', price })

describe('lineTotal', () => {
  it('is the price in total mode regardless of units or yours', () => {
    expect(lineTotal(row('3', '9.00', '1'), false)).toBe(9)
  })

  it('is units × price in per-unit mode', () => {
    expect(lineTotal(row('3', '2.50', '1'), true)).toBe(7.5)
  })

  it('treats blank or garbage fields as zero', () => {
    expect(lineTotal(row('', '', ''), false)).toBe(0)
    expect(lineTotal(row('abc', '4', ''), true)).toBe(0)
  })
})

describe('reconcile', () => {
  it('is balanced when line totals equal the entered subtotal', () => {
    const r = reconcile([row('1', '5'), row('2', '7')], false, '12')
    expect(r).toEqual({ lineSum: 12, subtotal: 12, diff: 0, status: 'balanced' })
  })

  it('ignores the Yours column', () => {
    expect(reconcile([row('2', '8', '1')], false, '8').status).toBe('balanced')
  })

  it('is off when the sums differ by more than one cent', () => {
    const r = reconcile([row('1', '20'), row('1', '21.5')], false, '42.10')
    expect(r.status).toBe('off')
    expect(r.diff).toBeCloseTo(-0.6, 2)
  })

  it('tolerates a one cent rounding difference', () => {
    expect(reconcile([row('1', '3.34'), row('1', '6.66')], false, '10.01').status).toBe('balanced')
  })

  it('is unknown when the subtotal is blank or not a number', () => {
    expect(reconcile([row('1', '5')], false, '')).toEqual(
      { lineSum: 5, subtotal: undefined, diff: undefined, status: 'unknown' }
    )
    expect(reconcile([row('1', '5')], false, 'abc').status).toBe('unknown')
  })

  it('uses per-unit line totals when perUnit is on', () => {
    expect(reconcile([row('2', '4')], true, '8').status).toBe('balanced')
  })
})

describe('reconcileMessage', () => {
  it('asks for the subtotal when it is unknown', () => {
    expect(reconcileMessage(reconcile([row('1', '5')], false, ''))).toBe(
      'Line items $5.00 · enter Sub Total to check'
    )
  })

  it('says the items match when balanced', () => {
    expect(reconcileMessage(reconcile([row('1', '5')], false, '5'))).toBe(
      'Line items $5.00 match Sub Total'
    )
  })

  it('says how far under the subtotal the items are', () => {
    expect(reconcileMessage(reconcile([row('1', '41.5')], false, '42.10'))).toBe(
      'Line items $41.50 · Sub Total $42.10 · $0.60 under'
    )
  })

  it('says how far over the subtotal the items are', () => {
    expect(reconcileMessage(reconcile([row('1', '43')], false, '42.10'))).toBe(
      'Line items $43.00 · Sub Total $42.10 · $0.90 over'
    )
  })
})
