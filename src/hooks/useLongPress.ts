import { useEffect, useRef } from 'react';
import type { PointerEvent, SyntheticEvent } from 'react';
import { pressStart, pressMoved, LONG_PRESS_MS } from '../lib/longPress.js';
import type { PressState } from '../lib/longPress.js';

export interface LongPressHandlers {
  onPointerDown: (e: PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onContextMenu: (e: SyntheticEvent) => void;
}

/**
 * Press-and-hold on any pointer type. Fires `onHold` after the pointer has
 * stayed down for `LONG_PRESS_MS` without drifting; a release or a drag
 * (so the swipe-to-delete gesture wins) cancels it. The context menu is
 * suppressed while a hold could fire so a mouse right-click or a touch
 * long-press doesn't pop the browser menu on top of ours.
 */
export function useLongPress(onHold: () => void, enabled = true): LongPressHandlers {
  const stateRef = useRef<PressState | null>(null);
  const timerRef = useRef<number | null>(null);
  const holdRef = useRef(onHold);
  holdRef.current = onHold;

  const cancel = () => {
    stateRef.current = null;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => cancel, []);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (!enabled) return;
    cancel();
    stateRef.current = pressStart(e.clientX, e.clientY);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (!stateRef.current) return;
      stateRef.current = null;
      holdRef.current();
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const s = stateRef.current;
    if (s && pressMoved(s, e.clientX, e.clientY)) cancel();
  };

  const onContextMenu = (e: SyntheticEvent) => {
    if (enabled) e.preventDefault();
  };

  return { onPointerDown, onPointerMove, onPointerUp: cancel, onPointerCancel: cancel, onContextMenu };
}
