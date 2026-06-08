import React, { useState } from 'react';

interface TaxCalculatorProps {
  /** Fired with the computed tax percentage when the user applies. */
  onApply: (percent: number) => void;
  /** Closes the calculator without applying. */
  onClose: () => void;
}

export function TaxCalculator({ onApply, onClose }: TaxCalculatorProps) {
  const [subTotal, setSubTotal] = useState('');
  const [taxAmount, setTaxAmount] = useState('');

  const sub = parseFloat(subTotal);
  const tax = parseFloat(taxAmount);
  const valid = sub > 0 && tax >= 0;
  const percent = valid ? (tax / sub) * 100 : 0;

  const handleApply = () => {
    if (!valid) return;
    onApply(Number(percent.toFixed(4)));
    onClose();
  };

  return (
    <div className="calc" role="dialog" aria-label="Calculate tax percentage">
      <div className="calc__card">
        <h2 className="calc__title">Calculate Tax %</h2>

        <div className="field">
          <label htmlFor="calc_subtotal">Sub Total</label>
          <input
            id="calc_subtotal"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={subTotal}
            onChange={(e) => setSubTotal(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="calc_tax">Tax Amount</label>
          <input
            id="calc_tax"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={taxAmount}
            onChange={(e) => setTaxAmount(e.target.value)}
          />
        </div>

        <p className="calc__result">
          Tax Rate: <strong>{valid ? `${percent.toFixed(2)}%` : '—'}</strong>
        </p>

        <div className="calc__actions">
          <button type="button" className="scan-btn scan-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="scan-btn"
            onClick={handleApply}
            disabled={!valid}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
