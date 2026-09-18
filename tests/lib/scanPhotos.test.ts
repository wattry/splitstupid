import { describe, it, expect } from 'vitest'
import { mergeScans, scanPhotos } from '../../src/lib/scanPhotos.js'

describe('mergeScans', () => {
  it('returns nothing for no photos', () => {
    expect(mergeScans([])).toEqual({ totals: {}, items: [] })
  })

  it('keeps line items in photo order', () => {
    const page1 = ['2 Fries 8.00', '1 Burger 12.00'].join('\n')
    const page2 = ['1 Soda 3.00'].join('\n')
    const { items } = mergeScans([page1, page2])
    expect(items.map((i) => i.desc)).toEqual(['Fries', 'Burger', 'Soda'])
    expect(items.map((i) => i.lineTotal)).toEqual([8, 12, 3])
  })

  it('takes each totals field from the first photo that has it', () => {
    const page1 = ['1 Fries 8.00', 'Subtotal 8.00'].join('\n')
    const page2 = ['Subtotal 99.00', 'Tax 0.60', 'Total 8.60'].join('\n')
    const { totals } = mergeScans([page1, page2])
    expect(totals).toEqual({ subtotal: 8, tax: 0.6, total: 8.6 })
  })

  it('ignores photos with no readable text', () => {
    const { items, totals } = mergeScans(['', 'garbage', '1 Fries 8.00'])
    expect(items).toHaveLength(1)
    expect(totals).toEqual({})
  })
})

describe('scanPhotos', () => {
  it('scans each photo in order and reports per-photo progress', async () => {
    const seen: string[] = []
    const progress: [number, number][] = []
    const fakeScan = async (image: Blob | string, opts: { onProgress: (p: number) => void }) => {
      seen.push(String(image))
      opts.onProgress(0.5)
      return `text for ${image}`
    }
    const texts = await scanPhotos(
      [{ src: 'blob:a' }, { src: 'blob:b' }],
      { onProgress: (i, f) => progress.push([i, f]), onPreview: () => {} },
      fakeScan
    )
    expect(seen).toEqual(['blob:a', 'blob:b'])
    expect(texts).toEqual(['text for blob:a', 'text for blob:b'])
    expect(progress).toEqual([[0, 0], [0, 0.5], [1, 0], [1, 0.5]])
  })
})
