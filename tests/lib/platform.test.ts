import { describe, it, expect } from 'vitest';
import { isIOS } from '../../src/lib/platform.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 13_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120 Mobile';

describe('isIOS', () => {
  it('recognises iPhone and iPad user agents', () => {
    expect(isIOS(IPHONE)).toBe(true);
    expect(isIOS(IPAD)).toBe(true);
  });

  it('recognises iPadOS Safari, which reports a Mac UA but has a touch screen', () => {
    expect(isIOS(MAC, 5)).toBe(true);
  });

  it('is false for a real Mac and for Android', () => {
    expect(isIOS(MAC, 0)).toBe(false);
    expect(isIOS(MAC)).toBe(false);
    expect(isIOS(ANDROID, 5)).toBe(false);
  });
});
