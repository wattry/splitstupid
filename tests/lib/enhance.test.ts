import { describe, it, expect } from 'vitest';
import { enhanceGray } from '../../src/lib/enhance.js';

/** Grayscale buffer of `n` pixels, all `value`. */
function flat(n: number, value: number): Uint8ClampedArray {
  return new Uint8ClampedArray(n).fill(value);
}

describe('enhanceGray', () => {
  it('stretches a low-contrast image to the full 0..255 range', () => {
    // Half "paper" at 140, half "ink" at 100.
    const gray = new Uint8ClampedArray(1000);
    gray.fill(100, 0, 500);
    gray.fill(140, 500);
    const out = enhanceGray(gray, { gamma: 1 });
    expect(out[0]).toBe(0);
    expect(out[999]).toBe(255);
  });

  it('ignores a single dark speck and a single glare pixel when picking the range', () => {
    const gray = new Uint8ClampedArray(1000);
    gray.fill(100, 0, 500);
    gray.fill(140, 500);
    gray[0] = 0; // dust speck
    gray[999] = 255; // glare
    const out = enhanceGray(gray, { gamma: 1 });
    // Bulk of the image still reaches the ends of the range.
    expect(out[10]).toBe(0);
    expect(out[990]).toBe(255);
  });

  it('brightens midtones when gamma is below 1', () => {
    const gray = new Uint8ClampedArray(1000);
    gray.fill(0, 0, 100);
    gray.fill(255, 900);
    gray.fill(128, 100, 900);
    const out = enhanceGray(gray, { gamma: 0.5 });
    expect(out[500]).toBeGreaterThan(128);
  });

  it('leaves a flat image finite and in range', () => {
    const out = enhanceGray(flat(100, 77));
    for (const v of out) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    }
  });

  it('returns a new buffer of the same length without mutating the input', () => {
    const gray = flat(50, 90);
    const out = enhanceGray(gray);
    expect(out).not.toBe(gray);
    expect(out.length).toBe(50);
    expect(gray[0]).toBe(90);
  });
});
