import React from 'react';
import type { CSSProperties } from 'react';

interface CircularLoadingProps {
  /** Diameter of the spinner in pixels. */
  size?: number;
  /** Thickness of the spinning ring in pixels. */
  thickness?: number;
  /** Seconds per full rotation. */
  speed?: number;
  /** Accessible label announced to screen readers. */
  label?: string;
}

// The app background is a fixed diagonal gradient (see body in styles.css):
//   linear-gradient(135deg, #7b2ff7 0%, #f107a3 50%, #ff7a18 100%)
// We reuse those stops in a conic-gradient so the spinner's sweep matches the
// page it sits on, then mask out the centre to leave only a ring.
const GRADIENT_STOPS = '#7b2ff7, #f107a3, #ff7a18, #f107a3, #7b2ff7';

const KEYFRAMES = `
@keyframes circular-loading-spin {
  to { transform: rotate(360deg); }
}`;

export function CircularLoading({
  size = 48,
  thickness = 5,
  speed = 0.9,
  label = 'Loading',
}: CircularLoadingProps) {
  const ringStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: `conic-gradient(from 0deg, ${GRADIENT_STOPS})`,
    // Punch a transparent hole so only a `thickness`-wide ring remains.
    WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - ${thickness}px))`,
    mask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - ${thickness}px))`,
    animation: `circular-loading-spin ${speed}s linear infinite`,
  };

  return (
    <div
      className="circular-loading"
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{ display: 'inline-flex' }}
    >
      <style>{KEYFRAMES}</style>
      <div style={ringStyle} />
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {label}
      </span>
    </div>
  );
}
