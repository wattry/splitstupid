import { describe, it, expect } from 'vitest'
import { scanWarnings } from '../../src/lib/scanWarnings.js'

const item = (lineTotal: number) => ({ units: 1, desc: 'x', lineTotal })

describe('scanWarnings', () => {
  it('is silent when line items and totals agree', () => {
    expect(
      scanWarnings({ subtotal: 12, tax: 1, tip: 2, total: 15 }, [item(5), item(7)])
    ).toEqual([])
  })

  it('leaves the line-items-vs-subtotal check to the live reconcile row', () => {
    expect(scanWarnings({ subtotal: 42.1 }, [item(20), item(21.5)])).toEqual([])
  })

  it('warns when subtotal + tax + tip does not match the printed total', () => {
    expect(
      scanWarnings({ subtotal: 42.1, tax: 3.16, tip: 5, total: 51 }, [item(42.1)])
    ).toEqual([
      'Subtotal + tax + tip is $50.26 but the receipt says total $51.00. Tax, fees or tip may be missing.',
    ])
  })

  it('treats missing tax and tip as zero for the total check', () => {
    expect(scanWarnings({ subtotal: 10, total: 10 }, [item(10)])).toEqual([])
  })

  it('ignores a one cent rounding difference', () => {
    expect(scanWarnings({ subtotal: 10.01, tax: 0.5, total: 10.5 }, [item(3.34), item(6.66)])).toEqual([])
  })

  it('skips a check when the receipt lacks its reference number', () => {
    expect(scanWarnings({ tax: 1 }, [item(5)])).toEqual([])
    expect(scanWarnings({ total: 99 }, [item(5)])).toEqual([])
  })

  it('only reports the total mismatch when line items are also off', () => {
    expect(scanWarnings({ subtotal: 10, tax: 1, total: 20 }, [item(5)])).toHaveLength(1)
  })
})
