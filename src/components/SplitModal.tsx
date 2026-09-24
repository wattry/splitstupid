import React, { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';

interface Props {
  /** Units on the row; the most that can be split out. */
  max: number;
  /** Row description, shown so the user knows what they're splitting. */
  desc: string;
  onSplit: (count: number) => void;
  onClose: () => void;
}

/** Clamp a typed count into 1..max; anything unparseable becomes 1. */
const clamp = (raw: string, max: number): number => {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, max);
};

/**
 * "Split" dialog opened by long-pressing a multi-unit row. Asks how many
 * single units to split out of the row (1 by default, at most every unit).
 */
export function SplitModal({ max, desc, onSplit, onClose }: Props): ReactElement {
  const [count, setCount] = useState('1');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSplit(clamp(count, max));
  };

  return (
    <div
      className="calc"
      role="dialog"
      aria-label="Split"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="calc__card split" onSubmit={submit} noValidate>
        <h2 className="calc__title">Split</h2>
        <p className="calc__result">
          Split out how many of the {max} {desc.trim() || 'units'}?
        </p>
        <input
          className="split__count"
          type="number"
          inputMode="numeric"
          min="1"
          max={max}
          step="1"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          aria-label="Units to split out"
          autoFocus
        />
        <div className="calc__actions">
          <button type="button" className="scan-btn scan-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="scan-btn">
            Split
          </button>
        </div>
      </form>
    </div>
  );
}
