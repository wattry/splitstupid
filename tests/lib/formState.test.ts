import { describe, it, expect } from 'vitest'
import { initialBill, scannedBill } from '../../src/lib/formState.js'
import type { Item } from '../../src/types.js'

const row = (id: string): Item => ({ id, units: '1', yours: '1', desc: 'Fries', price: '4.00' })

describe('initialBill', () => {
  it('starts every bill field blank with one empty row', () => {
    const bill = initialBill(() => row('a'))
    expect(bill).toEqual({
      billName: '',
      billSubtotal: '',
      fees: [],
      tipAmount: '',
      splitEven: false,
      partySize: '4',
      myParty: '2',
      items: [row('a')],
    })
  })
})

describe('scannedBill', () => {
  it('builds a fresh bill from the scan, never keeping old values', () => {
    const bill = scannedBill({ subtotal: 8, tax: 0.6, tip: 1.5 }, [row('x')])
    expect(bill).toEqual({
      ...initialBill(() => row('x')),
      billSubtotal: '8',
      fees: [expect.objectContaining({ label: 'Tax', amount: '0.6' })],
      tipAmount: '1.5',
      items: [row('x')],
    })
  })

  it('leaves totals the receipt lacked blank instead of stale', () => {
    const bill = scannedBill({ subtotal: 8 }, [row('x')])
    expect(bill.fees).toEqual([])
    expect(bill.tipAmount).toBe('')
    expect(bill.billName).toBe('')
    expect(bill.splitEven).toBe(false)
  })
})
