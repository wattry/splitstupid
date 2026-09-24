import { describe, it, expect } from 'vitest';
import { pressStart, pressMoved, LONG_PRESS_MS } from '../../src/lib/longPress.js';

describe('long press', () => {
  it('holds for half a second', () => {
    expect(LONG_PRESS_MS).toBe(500);
  });

  it('a wobble inside the dead zone does not cancel the press', () => {
    const s = pressStart(100, 50);
    expect(pressMoved(s, 103, 52)).toBe(false);
  });

  it('moving past the dead zone in any direction cancels the press', () => {
    const s = pressStart(100, 50);
    expect(pressMoved(s, 110, 50)).toBe(true);
    expect(pressMoved(s, 100, 40)).toBe(true);
  });
});
