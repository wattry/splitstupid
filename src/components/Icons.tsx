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

/** One line forking into two: split a row's units apart. */
export const SplitIcon = () => (
  <svg {...base}>
    <path d="M4 12h6" />
    <path d="M10 12c3 0 4-5 8-5" />
    <path d="M10 12c3 0 4 5 8 5" />
    <path d="M15 4l3 3-3 3" />
    <path d="M15 14l3 3-3 3" />
  </svg>
);

/** Person outline with a plus: assign a row to someone. */
export const AssignIcon = () => (
  <svg {...base}>
    <circle cx="10" cy="8" r="3.5" />
    <path d="M3.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    <path d="M19 8v6" />
    <path d="M16 11h6" />
  </svg>
);
