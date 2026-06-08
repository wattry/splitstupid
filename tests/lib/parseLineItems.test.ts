import { describe, it, expect } from 'vitest'
import { parseLineItems } from '../../src/lib/parseLineItems.js'

describe('parseLineItems', () => {
  it('returns [] for empty / nullish input', () => {
    expect(parseLineItems('')).toEqual([])
    expect(parseLineItems(null)).toEqual([])
  })

  it('defaults units to 1 when no leading number', () => {
    expect(parseLineItems('Bloody Mary $13.00')).toEqual([
      { units: 1, desc: 'Bloody Mary', lineTotal: 13.0 },
    ])
  })

  it('reads a leading quantity as units', () => {
    expect(parseLineItems('4 Beer 52.00')).toEqual([
      { units: 4, desc: 'Beer', lineTotal: 52.0 },
    ])
  })

  it('uses the last price as the line total (qty unit total)', () => {
    expect(parseLineItems('4 Beer 13.00 52.00')).toEqual([
      { units: 4, desc: 'Beer', lineTotal: 52.0 },
    ])
  })

  it('handles the messy real example', () => {
    expect(parseLineItems('1 ingle bordar bloody mary $13.00 ig')).toEqual([
      { units: 1, desc: 'ingle bordar bloody mary', lineTotal: 13.0 },
    ])
  })

  it('skips tax / total / date lines', () => {
    const text = [
      '2 Fries 8.00',
      'Subtotal 8.00',
      'Tax 0.60',
      'Total 8.60',
      'Date 12/25/2026',
    ].join('\n')
    expect(parseLineItems(text)).toEqual([
      { units: 2, desc: 'Fries', lineTotal: 8.0 },
    ])
  })

  it('prefers a $-tagged amount over a bare decimal', () => {
    // bare "2.00" (a stray/qty decimal) must not win over the real $13.00
    expect(parseLineItems('2.00 Margarita $13.00')).toEqual([
      { units: 1, desc: 'Margarita', lineTotal: 13.0 },
    ])
  })

  it('handles "$ 13.00" with a space after the sign', () => {
    expect(parseLineItems('Beer $ 13.00')).toEqual([
      { units: 1, desc: 'Beer', lineTotal: 13.0 },
    ])
  })

  it('does not treat "2%" as a quantity (needs whitespace)', () => {
    expect(parseLineItems('2% Milk 3.00')).toEqual([
      { units: 1, desc: '2% Milk', lineTotal: 3.0 },
    ])
  })
})
