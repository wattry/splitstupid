import React, { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export interface CustomTipProps {
  customTipPct: string;
  setCustomTip: Dispatch<SetStateAction<string>>;
  isWtf: boolean;
}

export const CustomTip = (props: CustomTipProps) => {
  const { customTipPct, setCustomTip, isWtf } = props;

  useEffect(() => {
    if (isWtf) {
      setCustomTip('20');
    }

    return () => setCustomTip('0');
  }, []);

  return <div className="field">
    <label htmlFor="custom_tip">Custom Tip (%)</label>
    <input
      id="tax"
      type="number"
      inputMode="decimal"
      min="0"
      step="1"
      placeholder="1.00"
      value={customTipPct}
      onChange={(e) => setCustomTip(e.target.value)}
    />
  </div>
};