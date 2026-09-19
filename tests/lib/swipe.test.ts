import { describe, it, expect } from 'vitest';
import { swipeStart, swipeMove, swipeEnd, swipeThreshold } from '../../src/lib/swipe.js';

describe('swipe state machine', () => {
  it('starts idle with no offset', () => {
    const s = swipeStart(100, 50);
    expect(s.dx).toBe(0);
    expect(s.axis).toBe('none');
  });

  it('locks to horizontal when x movement dominates and tracks left offset', () => {
    let s = swipeStart(100, 50);
    s = swipeMove(s, 80, 52);
    expect(s.axis).toBe('h');
    expect(s.dx).toBe(-20);
  });

  it('locks to vertical when y movement dominates and ignores x afterwards', () => {
    let s = swipeStart(100, 50);
    s = swipeMove(s, 102, 70);
    expect(s.axis).toBe('v');
    s = swipeMove(s, 20, 90);
    expect(s.dx).toBe(0);
  });

  it('does not lock an axis inside the dead zone', () => {
    const s = swipeMove(swipeStart(100, 50), 104, 53);
    expect(s.axis).toBe('none');
    expect(s.dx).toBe(0);
  });

  it('never offsets rightwards', () => {
    const s = swipeMove(swipeStart(100, 50), 140, 50);
    expect(s.dx).toBe(0);
  });

  it('threshold is 35% of width but at least 72px', () => {
    expect(swipeThreshold(100)).toBe(72);
    expect(swipeThreshold(400)).toBe(140);
  });

  it('commits delete past threshold, resets under it', () => {
    let s = swipeMove(swipeStart(300, 50), 100, 50);
    expect(swipeEnd(s, 400)).toBe('delete');
    s = swipeMove(swipeStart(300, 50), 200, 50);
    expect(swipeEnd(s, 400)).toBe('reset');
  });

  it('vertical drags always reset', () => {
    const s = swipeMove(swipeStart(300, 50), 300, 150);
    expect(swipeEnd(s, 100)).toBe('reset');
  });
});
