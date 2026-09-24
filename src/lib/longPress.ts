/**
 * Pure state for a press-and-hold gesture. The React hook feeds pointer
 * coordinates in; this decides whether the finger has drifted far enough to
 * count as a drag (which cancels the hold) rather than a press.
 */
export interface PressState {
  startX: number;
  startY: number;
}

/** How long the pointer must stay down before the hold fires. */
export const LONG_PRESS_MS = 500;

/** Drift allowed before the press is treated as a drag and cancelled. */
const DEAD_ZONE = 6;

export function pressStart(x: number, y: number): PressState {
  return { startX: x, startY: y };
}

/** True once the pointer has left the dead zone around where it went down. */
export function pressMoved(state: PressState, x: number, y: number): boolean {
  return Math.abs(x - state.startX) >= DEAD_ZONE || Math.abs(y - state.startY) >= DEAD_ZONE;
}
