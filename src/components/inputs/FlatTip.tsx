import React from 'react';
import type { SetStateAction, Dispatch, ReactElement } from 'react';

export interface FlatTipProps {
  tipAmount: string;
  setTipAmount: Dispatch<SetStateAction<string>>;
  finalTotal: string;
  setFinalTotal: Dispatch<SetStateAction<string>>
  rate: number;
}

// Flat-tip mode: payer added a dollar tip and we back out the rate from the
// tip amount and the final total. `rate` is the derived percent (for display).
export const FlatTip = ({ tipAmount, setTipAmount, finalTotal, setFinalTotal, rate }: FlatTipProps): ReactElement => (
  <>
    <div className="field">
      <label htmlFor="tip_amount">Tip Amount ($)</label>
      <input
        id="tip_amount"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={tipAmount}
        onChange={(e) => setTipAmount(e.target.value)}
      />
    </div>
    <div className="field">
      <label htmlFor="final_total">Total Before Tax ($)</label>
      <input
        id="final_total"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        placeholder="0.00"
        value={finalTotal}
        onChange={(e) => setFinalTotal(e.target.value)}
      />
      <span className="hint hint--muted">
        Tip works out to {rate.toFixed(2)}% of the after-tax bill
      </span>
    </div>
  </>
);