import React from 'react';

/** Inline SVG icons. `currentColor` so they follow the button's text colour. */

const base = {
  width: '1.25em',
  height: '1.25em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

/** Three itemised rows: a bullet and a line each. */
export const LineItemsIcon = () => (
  <svg {...base}>
    <circle cx="5" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="5" cy="18" r="1.2" fill="currentColor" stroke="none" />
    <line x1="10" y1="6" x2="20" y2="6" />
    <line x1="10" y1="12" x2="20" y2="12" />
    <line x1="10" y1="18" x2="20" y2="18" />
  </svg>
);

/** Pocket calculator: display bar over a 3×3 key grid. */
export const CalculatorIcon = () => (
  <svg {...base}>
    <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
    <rect x="8" y="5.5" width="8" height="3.5" rx="0.8" fill="currentColor" stroke="none" />
    {[12.5, 15.5, 18.5].flatMap((y) =>
      [8.8, 12, 15.2].map((x) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="currentColor" stroke="none" />
      ))
    )}
  </svg>
);
