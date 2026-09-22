import { describe, it, expect } from 'vitest';
import { pickBestText } from '../../src/lib/ocrScore.js';

const column = `2 Roast Beef                       £52.00
1 Small Gravy                      £1.50
Sun 06-Jul-2025 1:22 PM`;

const noPrices = `Castelvetrano Olives
Popcorn - Club
2024 Croft Vineyard           H`;

const garbage = `h/   wl a oy Th EA fd ilo 1 IN A
1 Diet gaia                 £62.00 Joh A il ea
&                       50.00 4B benef HE Fig`;

describe('pickBestText', () => {
  it('prefers the pass that found more priced lines', () => {
    expect(pickBestText([noPrices, column])).toBe(column);
  });

  it('prefers clean priced lines over a noisy pass with the same price count', () => {
    // Both have two priced lines; the garbage pass has far more junk around them.
    expect(pickBestText([garbage, column])).toBe(column);
  });

  it('keeps the first pass on a tie', () => {
    expect(pickBestText([column, column])).toBe(column);
  });
});
