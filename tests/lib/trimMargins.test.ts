import { describe, it, expect } from 'vitest';
import { findBrightBounds } from '../../src/lib/trimMargins.js';

/**
 * Build a grayscale image: `bright` inside the [x0,x1) x [y0,y1) rectangle,
 * `dark` everywhere else.
 */
function image(
  width: number,
  height: number,
  rect: { x0: number; x1: number; y0: number; y1: number } | null,
  dark = 30,
  bright = 230
): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inside = rect && x >= rect.x0 && x < rect.x1 && y >= rect.y0 && y < rect.y1;
      gray[y * width + x] = inside ? bright : dark;
    }
  }
  return gray;
}

describe('findBrightBounds', () => {
  it('trims dark left and right margins', () => {
    const gray = image(100, 50, { x0: 30, x1: 70, y0: 0, y1: 50 });
    const b = findBrightBounds(gray, 100, 50, { pad: 0 });
    expect(b).toEqual({ x: 30, y: 0, width: 40, height: 50 });
  });

  it('trims dark top and bottom margins', () => {
    const gray = image(50, 100, { x0: 0, x1: 50, y0: 20, y1: 90 });
    const b = findBrightBounds(gray, 50, 100, { pad: 0 });
    expect(b).toEqual({ x: 0, y: 20, width: 50, height: 70 });
  });

  it('returns the full image when there are no dark margins', () => {
    const gray = image(80, 60, { x0: 0, x1: 80, y0: 0, y1: 60 });
    const b = findBrightBounds(gray, 80, 60);
    expect(b).toEqual({ x: 0, y: 0, width: 80, height: 60 });
  });

  it('adds padding around the bright region, clamped to the image', () => {
    const gray = image(100, 50, { x0: 30, x1: 70, y0: 2, y1: 50 });
    const b = findBrightBounds(gray, 100, 50, { pad: 5 });
    expect(b).toEqual({ x: 25, y: 0, width: 50, height: 50 });
  });

  it('keeps the full image when the bright region is too narrow to be a receipt', () => {
    // 10% wide bright strip: probably a highlight, not the receipt.
    const gray = image(100, 50, { x0: 45, x1: 55, y0: 0, y1: 50 });
    const b = findBrightBounds(gray, 100, 50, { pad: 0 });
    expect(b).toEqual({ x: 0, y: 0, width: 100, height: 50 });
  });

  it('keeps the full image when the bright region is too short to be a receipt', () => {
    const gray = image(50, 100, { x0: 0, x1: 50, y0: 40, y1: 50 });
    const b = findBrightBounds(gray, 50, 100, { pad: 0 });
    expect(b).toEqual({ x: 0, y: 0, width: 50, height: 100 });
  });

  it('ignores printed text rows when finding the receipt column', () => {
    // Bright receipt from x 20..80 with a dark text line across it at y 10..12.
    const gray = image(100, 40, { x0: 20, x1: 80, y0: 0, y1: 40 });
    for (let y = 10; y < 12; y++) for (let x = 20; x < 80; x++) gray[y * 100 + x] = 0;
    const b = findBrightBounds(gray, 100, 40, { pad: 0 });
    expect(b).toEqual({ x: 20, y: 0, width: 60, height: 40 });
  });
});

describe('findBrightBounds with printed rows at the edges', () => {
  /** Paper everywhere; rows in `textRows` alternate ink/paper pixels. */
  function printed(width: number, height: number, textRows: number[]): Uint8ClampedArray {
    const gray = new Uint8ClampedArray(width * height).fill(230);
    for (const y of textRows) {
      for (let x = 0; x < width; x++) gray[y * width + x] = x % 2 === 0 ? 20 : 230;
    }
    return gray;
  }

  it('keeps a line of text on the last rows of a tightly cropped receipt', () => {
    const rows = Array.from({ length: 10 }, (_, i) => 90 + i);
    const gray = printed(60, 100, rows);
    const b = findBrightBounds(gray, 60, 100, { pad: 0 });
    expect(b).toEqual({ x: 0, y: 0, width: 60, height: 100 });
  });

  it('keeps a line of text on the first rows of a tightly cropped receipt', () => {
    const rows = Array.from({ length: 10 }, (_, i) => i);
    const gray = printed(60, 100, rows);
    const b = findBrightBounds(gray, 60, 100, { pad: 0 });
    expect(b).toEqual({ x: 0, y: 0, width: 60, height: 100 });
  });

  it('still trims a dark background below printed rows', () => {
    const width = 60;
    const height = 100;
    const gray = printed(width, height, [80, 81, 82, 83]);
    for (let y = 85; y < height; y++) for (let x = 0; x < width; x++) gray[y * width + x] = 30;
    const b = findBrightBounds(gray, width, height, { pad: 0 });
    expect(b).toEqual({ x: 0, y: 0, width, height: 85 });
  });
});
