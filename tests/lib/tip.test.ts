import { describe, it, expect } from 'vitest';
import { TIP_PRESETS, tipForPercent } from '../../src/lib/tip.js';

describe('tip presets', () => {
  it('run 10% to 25% in 5% steps', () => {
    expect(TIP_PRESETS).toEqual([10, 15, 20, 25]);
  });
});

describe('tipForPercent', () => {
  it('returns the tip as a 2-decimal string of the subtotal', () => {
    expect(tipForPercent('42.50', 20)).toBe('8.50');
    expect(tipForPercent('33.33', 15)).toBe('5.00');
  });

  it('treats a blank or invalid subtotal as zero', () => {
    expect(tipForPercent('', 20)).toBe('0.00');
    expect(tipForPercent('abc', 20)).toBe('0.00');
  });
});
