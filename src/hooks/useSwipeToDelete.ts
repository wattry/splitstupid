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

export interface SwipeToDelete {
  /** Spread onto the element that should receive the gesture. */
  handlers: SwipeHandlers;
  /** Transform/transition for the sliding layer. */
  style: CSSProperties;
  /** 0..1 how far towards the delete threshold; drives the backing layer. */
  progress: number;
  /** True once the row is animating out. */
  leaving: boolean;
}

const LEAVE_MS = 180;

/**
 * Touch-only swipe-left-to-delete. Mouse pointers are ignored so desktop
 * text selection in the inputs keeps working; desktop gets the × button.
 */
export function useSwipeToDelete(onDelete: () => void): SwipeToDelete {
  const stateRef = useRef<SwipeState | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const widthRef = useRef(0);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'touch' || leaving) return;
    stateRef.current = swipeStart(e.clientX, e.clientY);
    widthRef.current = e.currentTarget.offsetWidth;
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const s = stateRef.current;
    if (!s) return;
    const next = swipeMove(s, e.clientX, e.clientY);
    stateRef.current = next;
    if (next.axis === 'h') {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDx(next.dx);
    }
  };

  const finish = (e: PointerEvent<HTMLElement>) => {
    const s = stateRef.current;
    if (!s) return;
    stateRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (swipeEnd(s, widthRef.current) === 'delete') {
      setLeaving(true);
      setDx(-widthRef.current);
      window.setTimeout(onDelete, LEAVE_MS);
    } else {
      setDx(0);
    }
  };

  const onPointerCancel = () => {
    stateRef.current = null;
    setDragging(false);
    setDx(0);
  };

  const threshold = Math.max(72, widthRef.current * 0.35);

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel },
    style: {
      transform: `translateX(${dx}px)`,
      transition: dragging ? 'none' : `transform ${LEAVE_MS}ms ease-out`,
    },
    progress: Math.min(1, -dx / threshold),
    leaving,
  };
}
