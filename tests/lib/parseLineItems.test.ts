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

  it('reads the quantity past OCR junk at the line start', () => {
    expect(parseLineItems('ae 2 Blood Orange Margarita $24.00')).toEqual([
      { units: 2, desc: 'Blood Orange Margarita', lineTotal: 24.0 },
    ])
    expect(parseLineItems('RE TEA 1 Lucca’s Lemonade $11.00')).toEqual([
      { units: 1, desc: 'Lucca’s Lemonade', lineTotal: 11.0 },
    ])
    expect(parseLineItems('ets 1 Spaghetti Con Gamberetti $23.00')).toEqual([
      { units: 1, desc: 'Spaghetti Con Gamberetti', lineTotal: 23.0 },
    ])
  })

  it('ignores junk digits not followed by a word', () => {
    // "08" is OCR noise; the real quantity is the 1 before the item name.
    expect(parseLineItems('“08 1 Linguine with Basil Pesto $15.00')).toEqual([
      { units: 1, desc: 'Linguine with Basil Pesto', lineTotal: 15.0 },
    ])
  })

  it('defaults units to 1 when the quantity is fused into junk', () => {
    expect(parseLineItems('E21 Garlic Bread $7.50')).toEqual([
      { units: 1, desc: 'E21 Garlic Bread', lineTotal: 7.5 },
    ])
  })

  it('joins a wrapped item so its quantity is kept', () => {
    const text = [
      '2 Migration Brewing Straight Outta',
      'Portland IPA $12.00',
    ].join('\n')
    expect(parseLineItems(text)).toEqual([
      { units: 2, desc: 'Migration Brewing Straight Outta Portland IPA', lineTotal: 12.0 },
    ])
  })

  it('does not merge header lines into the first item', () => {
    const text = ['Pastini - City Center', '1 Martini $11.00'].join('\n')
    expect(parseLineItems(text)).toEqual([
      { units: 1, desc: 'Martini', lineTotal: 11.0 },
    ])
  })

  it('does not merge when the priced line already has a quantity', () => {
    const text = ['2 Migration Brewing Straight Outta', '1 Beer 5.00'].join('\n')
    expect(parseLineItems(text)).toEqual([
      { units: 1, desc: 'Beer', lineTotal: 5.0 },
    ])
  })

  it('does not merge across an intervening non-item line', () => {
    const text = [
      '2 Migration Brewing Straight Outta',
      'Guest Count: 4',
      'Portland IPA $12.00',
    ].join('\n')
    expect(parseLineItems(text)).toEqual([
      { units: 1, desc: 'Portland IPA', lineTotal: 12.0 },
    ])
  })

  it('keeps numbers inside the item name out of the quantity', () => {
    expect(parseLineItems('1 Coke 12 oz 3.00')).toEqual([
      { units: 1, desc: 'Coke 12 oz', lineTotal: 3.0 },
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

describe('pound-priced receipts', () => {
  it('reads a £ price and keeps the currency sign out of the description', () => {
    const items = parseLineItems('1 Diet Coke                        £3.75');
    expect(items).toEqual([{ units: 1, desc: 'Diet Coke', lineTotal: 3.75 }]);
  });
});

describe('description-first layouts (Item  Qty  Price)', () => {
  it('takes a quantity that sits between the description and the price', () => {
    const items = parseLineItems('Bluebird Cuvee Brut           4    $117.60');
    expect(items).toEqual([{ units: 4, desc: 'Bluebird Cuvee Brut', lineTotal: 117.6 }]);
  });

  it('keeps a leading year in the item name when the quantity comes later', () => {
    const items = parseLineItems('2025 Dundee Hills Estate      5    $112.00');
    expect(items).toEqual([{ units: 5, desc: '2025 Dundee Hills Estate', lineTotal: 112 }]);
  });

  it('defaults to one unit when there is no quantity anywhere', () => {
    const items = parseLineItems('Castelvetrano Olives        $11.00');
    expect(items).toEqual([{ units: 1, desc: 'Castelvetrano Olives', lineTotal: 11 }]);
  });

  it('prefers a leading quantity over a number inside the name', () => {
    const items = parseLineItems('2 Coke 12 oz 5.00');
    expect(items).toEqual([{ units: 2, desc: 'Coke 12 oz', lineTotal: 5 }]);
  });

  it('skips "Original price" lines, which are not items', () => {
    const items = parseLineItems('Sauvignon Blanc\nOriginal price: $175.00');
    expect(items).toEqual([]);
  });
});

describe('leading quantity before a mangled token', () => {
  it('still takes a line-start integer as the quantity when OCR junk follows it', () => {
    const items = parseLineItems('1 5£1 SHIFT Charity Donation       £1.00');
    expect(items).toEqual([{ units: 1, desc: '51 SHIFT Charity Donation', lineTotal: 1 }]);
  });
});

describe('hand-typed whole-dollar prices', () => {
  it('accepts a signed amount without cents', () => {
    expect(parseLineItems('2025 Dundee Hills Estate   4  $112')).toEqual([
      { units: 4, desc: '2025 Dundee Hills Estate', lineTotal: 112 },
    ]);
  });

  it('still needs cents when there is no currency sign, so a quantity is never a price', () => {
    expect(parseLineItems('2 Beer 52')).toEqual([]);
  });
});

describe('OCR gap between the dot and the cents', () => {
  it('reads "$12. 50" as 12.5', () => {
    expect(parseLineItems('Soup   $12. 50')).toEqual([{ units: 1, desc: 'Soup', lineTotal: 12.5 }]);
  });
});
