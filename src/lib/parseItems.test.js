import { describe, it, expect } from 'vitest'
import { parseItems } from './parseItems.js'

describe('parseItems', () => {
  it('parses space-separated numbers', () => {
    expect(parseItems('12.50 8 4.25')).toEqual([12.5, 8, 4.25])
  })

  it('strips a leading $ from tokens', () => {
    expect(parseItems('$12 $3.50')).toEqual([12, 3.5])
  })

  it('drops garbage tokens', () => {
    expect(parseItems('12 abc 4 ?? 5')).toEqual([12, 4, 5])
  })

  it('ignores negative numbers', () => {
    expect(parseItems('10 -5 3')).toEqual([10, 3])
  })

  it('returns empty array for empty / whitespace input', () => {
    expect(parseItems('')).toEqual([])
    expect(parseItems('   ')).toEqual([])
  })

  it('collapses multiple spaces / tabs / newlines', () => {
    expect(parseItems('1\t2\n3   4')).toEqual([1, 2, 3, 4])
  })

  it('drops a bare $ token (empty after stripping)', () => {
    expect(parseItems('$ 5')).toEqual([5])
    expect(parseItems('$')).toEqual([])
  })
})
