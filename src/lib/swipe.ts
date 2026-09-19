/**
 * Pure state for a swipe-left-to-delete gesture. The React hook feeds pointer
 * coordinates in; this decides whether the drag is horizontal or vertical
 * (so vertical scrolls are left alone) and how far the row has slid.
 */
export type SwipeAxis = 'none' | 'h' | 'v';

export interface SwipeState {
  startX: number;
  startY: number;
  /** Horizontal offset in px; always <= 0 (left only). */
  dx: number;
  axis: SwipeAxis;
}

/** Movement needed before the gesture commits to an axis. */
const DEAD_ZONE = 6;

export function swipeStart(x: number, y: number): SwipeState {
  return { startX: x, startY: y, dx: 0, axis: 'none' };
}

export function swipeMove(state: SwipeState, x: number, y: number): SwipeState {
  const rawDx = x - state.startX;
  const rawDy = y - state.startY;
  let axis = state.axis;

  if (axis === 'none') {
    if (Math.abs(rawDx) < DEAD_ZONE && Math.abs(rawDy) < DEAD_ZONE) return state;
    axis = Math.abs(rawDx) > Math.abs(rawDy) ? 'h' : 'v';
  }

  if (axis === 'v') return { ...state, axis, dx: 0 };

  return { ...state, axis, dx: Math.min(0, rawDx) };
}

/** Distance the row must slide before release deletes it. */
export function swipeThreshold(width: number): number {
  return Math.max(72, width * 0.35);
}

export function swipeEnd(state: SwipeState, width: number): 'delete' | 'reset' {
  if (state.axis !== 'h') return 'reset';
  return -state.dx >= swipeThreshold(width) ? 'delete' : 'reset';
}
