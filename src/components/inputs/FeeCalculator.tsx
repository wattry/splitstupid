import React, { useEffect, useRef, useState } from 'react';
import { usePostHog } from '@posthog/react';
import type { Fee } from '../../types.js';
import { feeSummary, feeTotal, makeFee, pruneBlankFees } from '../../lib/fees.js';
import { LineItemsIcon } from '../Icons.js';

export interface FeeCalculatorProps {
  /** The bill's itemised taxes and fees, owned by the parent. */
  fees: Fee[];
  /** Every edit is pushed up as it happens; the parent's total follows. */
  onChange: (fees: Fee[]) => void;
}

/**
 * Popover listing each tax/fee as a labelled row with a running sum. Edits
 * apply live, so the list survives closing and reopening; rows left blank in
 * both fields are dropped on close.
 */
export const FeeCalculator = ({ fees, onChange }: FeeCalculatorProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const posthog = usePostHog();

  const openPanel = () => {
    posthog.capture('fee_calculator_opened', feeSummary(fees));
    if (fees.length === 0) onChange([makeFee()]);
    setOpen(true);
  };

  const closePanel = (via: 'done' | 'outside') => {
    const pruned = pruneBlankFees(fees);
    posthog.capture('fee_calculator_closed', { ...feeSummary(pruned), via });
    if (pruned.length !== fees.length) onChange(pruned);
    setOpen(false);
  };

  // Close the panel when clicking anywhere outside this component.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closePanel('outside');
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  });

  const setFee = (id: string, patch: Partial<Fee>) =>
    onChange(fees.map((fee) => (fee.id === id ? { ...fee, ...patch } : fee)));
  const addFee = () => {
    onChange([...fees, makeFee()]);
    posthog.capture('fee_added', { fee_count: fees.length + 1 });
  };
  const removeFee = (id: string) => {
    const next = fees.filter((fee) => fee.id !== id);
    onChange(next.length ? next : [makeFee()]);
    posthog.capture('fee_removed', { fee_count: next.length });
  };

  return (
    <div className="feecalc" ref={rootRef}>
      <button
        type="button"
        className="feecalc__toggle"
        onClick={() => (open ? closePanel('done') : openPanel())}
        aria-expanded={open}
        aria-label="Itemise taxes & fees"
      >
        <LineItemsIcon />
      </button>

      {open && (
        <div className="feecalc__panel">
          {fees.map((fee) => (
            <div className="feecalc__row" key={fee.id}>
              <input
                type="text"
                placeholder="Tax"
                aria-label="Fee name"
                value={fee.label}
                onChange={(e) => setFee(fee.id, { label: e.target.value })}
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                aria-label="Fee amount"
                value={fee.amount}
                onChange={(e) => setFee(fee.id, { amount: e.target.value })}
              />
              <button
                type="button"
                className="feecalc__remove"
                onClick={() => removeFee(fee.id)}
                aria-label="Remove fee"
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
            <span>${feeTotal(fees).toFixed(2)}</span>
          </div>

          <button type="button" className="feecalc__done" onClick={() => closePanel('done')}>
            Done
          </button>
        </div>
      )}
    </div>
  );
};
