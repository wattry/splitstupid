/**
 * Pure state for a swipe-to-reveal gesture. The React hook feeds pointer
 * coordinates in; this decides whether the drag is horizontal or vertical
 * (so vertical scrolls are left alone) and how far the row has slid. Sliding
 * left uncovers a tray of action buttons; on release the row snaps fully
 * open or closed.
 */
export type SwipeAxis = 'none' | 'h' | 'v';

export interface SwipeState {
  startX: number;
  startY: number;
  /** Offset the row had when the gesture began: 0 closed, -tray open. */
  base: number;
  /** Current horizontal offset in px; always in [-tray, 0]. */
  dx: number;
  axis: SwipeAxis;
}

/** Width of one action button in the tray. */
export const ACTION_WIDTH = 72;

/** Movement needed before the gesture commits to an axis. */
const DEAD_ZONE = 6;

export function swipeStart(x: number, y: number, base: number): SwipeState {
  return { startX: x, startY: y, base, dx: base, axis: 'none' };
}

export function swipeMove(state: SwipeState, x: number, y: number, tray: number): SwipeState {
  const rawDx = x - state.startX;
  const rawDy = y - state.startY;
  let axis = state.axis;

  if (axis === 'none') {
    if (Math.abs(rawDx) < DEAD_ZONE && Math.abs(rawDy) < DEAD_ZONE) return state;
    axis = Math.abs(rawDx) > Math.abs(rawDy) ? 'h' : 'v';
  }

  if (axis === 'v') return { ...state, axis, dx: state.base };

  return { ...state, axis, dx: Math.max(-tray, Math.min(0, state.base + rawDx)) };
}

/** Where the row settles on release: open past half the tray, else closed. */
export function swipeEnd(state: SwipeState, tray: number): 'open' | 'closed' {
  return -state.dx > tray / 2 ? 'open' : 'closed';
}
