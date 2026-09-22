import { describe, it, expect } from 'vitest'
import { parseTotals } from '../../src/lib/parseTotals.js'

describe('parseTotals', () => {
  it('returns {} for empty / nullish input', () => {
    expect(parseTotals('')).toEqual({})
    expect(parseTotals(null)).toEqual({})
  })

  it('extracts subtotal, tax and tip lines', () => {
    const text = [
      '2 Fries 8.00',
      'Subtotal 8.00',
      'Tax 0.60',
      'Tip 1.50',
      'Total 10.10',
    ].join('\n')
    expect(parseTotals(text)).toEqual({ subtotal: 8.0, tax: 0.6, tip: 1.5, total: 10.1 })
  })

  it('accepts $ signs and OCR spacing', () => {
    const text = [
      'Sub-Total $ 42.10',
      'Sales Tax $3.16',
      'Gratuity $8.00',
    ].join('\n')
    expect(parseTotals(text)).toEqual({ subtotal: 42.1, tax: 3.16, tip: 8.0 })
  })

  it('matches "Sub Total" with a space', () => {
    expect(parseTotals('Sub Total 15.00')).toEqual({ subtotal: 15.0 })
  })

  it('omits fields not present', () => {
    expect(parseTotals('Subtotal 20.00')).toEqual({ subtotal: 20.0 })
  })

  it('derives subtotal from total when subtotal line is missing', () => {
    const text = ['Tax 1.00', 'Tip 2.00', 'Total 13.00'].join('\n')
    expect(parseTotals(text)).toEqual({ subtotal: 10.0, tax: 1.0, tip: 2.0, total: 13.0 })
  })

  it('does not mistake "Total" for "Subtotal"', () => {
    expect(parseTotals('Total 25.00')).toEqual({ total: 25.0 })
  })

  it('uses the last price token on the line', () => {
    expect(parseTotals('Subtotal 2 18.00')).toEqual({ subtotal: 18.0 })
  })

  it('ignores item lines and noise', () => {
    const text = [
      '1 Bloody Mary $13.00',
      'Visa 10.10',
      'Tel 555-0100',
      'Subtotal 13.00',
    ].join('\n')
    expect(parseTotals(text)).toEqual({ subtotal: 13.0 })
  })

  it('ignores totals-keyword lines without a price', () => {
    expect(parseTotals('Subtotal\nTax')).toEqual({})
  })

  it('keeps the first match when a keyword repeats', () => {
    const text = ['Subtotal 8.00', 'Subtotal 99.00'].join('\n')
    expect(parseTotals(text)).toEqual({ subtotal: 8.0 })
  })
})

describe('hand-typed whole-dollar totals', () => {
  it('accepts a signed amount without cents', () => {
    expect(parseTotals('Sub Total: $363\nTip: $30')).toEqual({ subtotal: 363, tip: 30 });
  });
});
