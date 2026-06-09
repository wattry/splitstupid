import React, { useEffect, useRef, useState } from 'react';

export interface FeeCalculatorProps {
  /** Called with the summed total (as a fixed-2 string) when the user applies. */
  onApply: (total: string) => void;
}

// A small popover calculator: the user lists individual taxes/fees, sees a
// running sum, and applies that sum to the "Total Taxes & Fees" field.
export const FeeCalculator = ({ onApply }: FeeCalculatorProps) => {
  const [open, setOpen] = useState(false);
  const [fees, setFees] = useState<string[]>(['']);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const sum = fees.reduce((acc, f) => acc + (parseFloat(f) || 0), 0);

  const setFee = (i: number, value: string) =>
    setFees(fees.map((f, idx) => (idx === i ? value : f)));
  const addFee = () => setFees([...fees, '']);
  const removeFee = (i: number) => setFees(fees.filter((_, idx) => idx !== i));

  const apply = () => {
    onApply(sum.toFixed(2));
    setOpen(false);
  };

  return (
    <div className="feecalc" ref={rootRef}>
      <button
        type="button"
        className="feecalc__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Open taxes & fees calculator"
      >
        🧮
      </button>

      {open && (
        <div className="feecalc__panel">
          {fees.map((fee, i) => (
            <div className="feecalc__row" key={i}>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={fee}
                onChange={(e) => setFee(i, e.target.value)}
              />
              <button
                type="button"
                className="feecalc__remove"
                onClick={() => removeFee(i)}
                aria-label="Remove fee"
                disabled={fees.length <= 1}
              >
                ×
              </button>
            </div>
          ))}

          <button type="button" className="feecalc__add" onClick={addFee}>
            + Add fee
          </button>

          <div className="feecalc__sum">
            <span>Total</span>
            <span>${sum.toFixed(2)}</span>
          </div>

          <button type="button" className="feecalc__apply" onClick={apply}>
            Apply
          </button>
        </div>
      )}
    </div>
  );
};
