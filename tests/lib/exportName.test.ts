import { describe, it, expect } from 'vitest'
import { exportFileName } from '../../src/lib/exportName.js'

const at = new Date(2026, 8, 18, 13, 5, 9) // local time: 2026-09-18 13:05:09

describe('exportFileName', () => {
  it('stamps YYYYMMDDHHmmss then a slug of the bill name', () => {
    expect(exportFileName('Dinner at Thai Place', 'jpg', at)).toBe('20260918130509-dinner-at-thai-place.jpg')
  })

  it('falls back to the app name when the bill has no name', () => {
    expect(exportFileName('', 'json', at)).toBe('20260918130509-split-stoopid.json')
    expect(exportFileName('   ', 'json', at)).toBe('20260918130509-split-stoopid.json')
  })

  it('collapses punctuation and repeated separators', () => {
    expect(exportFileName("  Joe's  Bar & Grill!!", 'jpg', at)).toBe('20260918130509-joe-s-bar-grill.jpg')
  })
})
