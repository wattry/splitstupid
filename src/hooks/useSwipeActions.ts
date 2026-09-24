import { useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { swipeStart, swipeMove, swipeEnd } from '../lib/swipe.js';
import type { SwipeState } from '../lib/swipe.js';

interface SwipeHandlers {
  onPointerDown: (e: PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: PointerEvent<HTMLElement>) => void;
}

export interface SwipeActions {
  /** Spread onto the element that should receive the gesture. */
  handlers: SwipeHandlers;
  /** Transform/transition for the sliding layer. */
  style: CSSProperties;
  /** Slide the row fully out, then call `onGone`. */
  leave: (onGone: () => void) => void;
  /** True once the row is animating out. */
  leaving: boolean;
  /** True while the finger is moving the row. */
  dragging: boolean;
}

const LEAVE_MS = 180;

/**
 * Touch-only swipe-left to reveal a tray of action buttons `tray` px wide.
 * The row snaps fully open or closed on release; `open` is owned by the
 * parent so only one row is open at a time. Mouse pointers are ignored so
 * desktop text selection in the inputs keeps working.
 */
export function useSwipeActions(
  tray: number,
  open: boolean,
  onOpenChange: (open: boolean) => void
): SwipeActions {
  const stateRef = useRef<SwipeState | null>(null);
  const [dragDx, setDragDx] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const widthRef = useRef(0);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'touch' || leaving) return;
    stateRef.current = swipeStart(e.clientX, e.clientY, open ? -tray : 0);
    widthRef.current = e.currentTarget.offsetWidth;
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const s = stateRef.current;
    if (!s) return;
    const next = swipeMove(s, e.clientX, e.clientY, tray);
    stateRef.current = next;
    if (next.axis === 'h') {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDragDx(next.dx);
    }
  };

  const finish = (e: PointerEvent<HTMLElement>) => {
    const s = stateRef.current;
    if (!s) return;
    stateRef.current = null;
    setDragDx(null);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const settled = swipeEnd(s, tray) === 'open';
    if (settled !== open) onOpenChange(settled);
  };

  const onPointerCancel = () => {
    stateRef.current = null;
    setDragDx(null);
  };

  const leave = (onGone: () => void) => {
    setLeaving(true);
    window.setTimeout(onGone, LEAVE_MS);
  };

  const dx = leaving ? -Math.max(widthRef.current, tray) : dragDx ?? (open ? -tray : 0);

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel },
    style: {
      transform: `translateX(${dx}px)`,
      transition: dragDx !== null ? 'none' : `transform ${LEAVE_MS}ms ease-out`,
    },
    leave,
    leaving,
    dragging: dragDx !== null,
  };
}
