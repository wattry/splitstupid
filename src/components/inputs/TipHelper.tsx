import React, { useEffect, useRef, useState } from 'react';
import { TIP_PRESETS, tipForPercent } from '../../lib/tip.js';

export interface TipHelperProps {
  /** Whole-bill subtotal the percentage applies to. */
  subtotal: string;
  /** Called with the tip in dollars (fixed-2 string) when a preset is picked. */
  onApply: (tip: string) => void;
}

// "HELP ME" popover next to the Tip field: pick 10/15/20/25% of the subtotal.
export const TipHelper = ({ subtotal, onApply }: TipHelperProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasSubtotal = (parseFloat(subtotal) || 0) > 0;

  // Close the panel when clicking anywhere outside this component.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const pick = (pct: number) => {
    onApply(tipForPercent(subtotal, pct));
    setOpen(false);
  };

  return (
    <div className="feecalc" ref={rootRef}>
      <button
        type="button"
        className="feecalc__toggle tiphelp__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Pick a tip percentage"
      >
        HELP ME
      </button>

      {open && (
        <div className="feecalc__panel">
          {hasSubtotal ? (
            <div className="tiphelp__grid">
              {TIP_PRESETS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  className="tiphelp__pct"
                  onClick={() => pick(pct)}
                >
                  {pct}%
                  <small>${tipForPercent(subtotal, pct)}</small>
                </button>
              ))}
            </div>
          ) : (
            <span className="hint hint--muted">Enter the Sub Total first.</span>
          )}
        </div>
      )}
    </div>
  );
};
