import React, { useState } from 'react';

export interface FeeCalculatorProps {
  /** Called with the summed total (as a fixed-2 string) when the user applies. */
  onApply: (total: string) => void;
}

// A floating 🧮 button that opens a modal calculator: the user lists individual
// taxes/fees, sees a running sum, and applies that sum to "Total Taxes & Fees".
export const FeeCalculator = ({ onApply }: FeeCalculatorProps) => {
  const [open, setOpen] = useState(false);
  const [fees, setFees] = useState<string[]>(['']);

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
    <>
      <button
        type="button"
        className="fab"
        onClick={() => setOpen(true)}
        aria-label="Open taxes & fees calculator"
      >
        🧮
      </button>

      {open && (
        <div
          className="calc"
          role="dialog"
          aria-label="Taxes & fees calculator"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="calc__card feecalc">
            <h2 className="calc__title">Taxes &amp; Fees</h2>

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

            <div className="calc__actions">
              <button
                type="button"
                className="scan-btn scan-btn--ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="scan-btn" onClick={apply}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
