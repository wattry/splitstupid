import { describe, it, expect } from 'vitest';
import { swipeStart, swipeMove, swipeEnd, ACTION_WIDTH } from '../../src/lib/swipe.js';

// Two 72px action buttons behind the row.
const TRAY = 2 * ACTION_WIDTH;

describe('swipe state machine', () => {
  it('starts at the base offset with no axis', () => {
    expect(swipeStart(100, 50, 0)).toMatchObject({ dx: 0, axis: 'none', base: 0 });
    expect(swipeStart(100, 50, -TRAY)).toMatchObject({ dx: -TRAY, axis: 'none', base: -TRAY });
  });

  it('locks to horizontal when x movement dominates and tracks the offset from base', () => {
    let s = swipeStart(100, 50, 0);
    s = swipeMove(s, 80, 52, TRAY);
    expect(s.axis).toBe('h');
    expect(s.dx).toBe(-20);
  });

  it('locks to vertical when y movement dominates and keeps the base offset afterwards', () => {
    let s = swipeStart(100, 50, -TRAY);
    s = swipeMove(s, 102, 70, TRAY);
    expect(s.axis).toBe('v');
    s = swipeMove(s, 20, 90, TRAY);
    expect(s.dx).toBe(-TRAY);
  });

  it('does not lock an axis inside the dead zone', () => {
    const s = swipeMove(swipeStart(100, 50, 0), 104, 53, TRAY);
    expect(s.axis).toBe('none');
    expect(s.dx).toBe(0);
  });

  it('clamps between fully open and closed', () => {
    expect(swipeMove(swipeStart(100, 50, 0), 140, 50, TRAY).dx).toBe(0);
    expect(swipeMove(swipeStart(300, 50, 0), 0, 50, TRAY).dx).toBe(-TRAY);
    // Dragging an open row rightwards closes it but never past zero.
    expect(swipeMove(swipeStart(100, 50, -TRAY), 400, 50, TRAY).dx).toBe(0);
  });

  it('snaps open past half the tray, closed under it', () => {
    let s = swipeMove(swipeStart(300, 50, 0), 300 - TRAY / 2 - 1, 50, TRAY);
    expect(swipeEnd(s, TRAY)).toBe('open');
    s = swipeMove(swipeStart(300, 50, 0), 300 - TRAY / 2 + 1, 50, TRAY);
    expect(swipeEnd(s, TRAY)).toBe('closed');
  });

  it('a tap on an open row leaves it open; a tap on a closed row leaves it closed', () => {
    expect(swipeEnd(swipeStart(100, 50, -TRAY), TRAY)).toBe('open');
    expect(swipeEnd(swipeStart(100, 50, 0), TRAY)).toBe('closed');
  });

  it('vertical drags keep the state they started in', () => {
    const s = swipeMove(swipeStart(300, 50, -TRAY), 300, 150, TRAY);
    expect(swipeEnd(s, TRAY)).toBe('open');
  });
});
