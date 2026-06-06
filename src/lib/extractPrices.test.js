import { describe, it, expect } from 'vitest'
import { extractPrices } from './extractPrices.js'

describe('extractPrices', () => {
  it('returns [] for empty / nullish input', () => {
    expect(extractPrices('')).toEqual([])
    expect(extractPrices(null)).toEqual([])
    expect(extractPrices(undefined)).toEqual([])
  })

  it('pulls price-shaped tokens from item lines', () => {
    const text = ['Burger 12.50', 'Fries 4.25', 'Soda 2.00'].join('\n')
    expect(extractPrices(text)).toEqual([12.5, 4.25, 2.0])
  })

  it('drops subtotal / tax / total lines', () => {
    const text = [
      'Burger 12.50',
      'Subtotal 12.50',
      'Tax 0.94',
      'Total 13.44',
    ].join('\n')
    expect(extractPrices(text)).toEqual([12.5])
  })

  it('drops dates and phone numbers', () => {
    const text = [
      'Date 12/25/2026',
      'Tel 5551234567',
      'Sandwich 8.99',
    ].join('\n')
    expect(extractPrices(text)).toEqual([8.99])
  })

  it('ignores tokens without two decimals', () => {
    const text = ['Item 12', 'Item 3.5', 'Item 9.99'].join('\n')
    expect(extractPrices(text)).toEqual([9.99])
  })

  it('handles multiple prices on one line', () => {
    expect(extractPrices('2 x Coffee 3.50 7.00')).toEqual([3.5, 7.0])
  })

  it('skips zero-value prices', () => {
    expect(extractPrices('Free item 0.00\nReal 5.00')).toEqual([5.0])
  })
})