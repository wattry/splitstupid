import React from 'react';
import type { ReactElement } from 'react';
import type { Reconciliation } from '../lib/reconcile.js';
import { reconcileMessage } from '../lib/reconcile.js';

interface ReconcileRowProps {
  reconciliation: Reconciliation;
  /** True while the split controls are hidden pending a balanced bill. */
  locked: boolean;
  onContinue: () => void;
}

/**
 * Live comparison of the rows' full line totals against the Sub Total field.
 * Sits under the last line item. Red while off, green once balanced, muted
 * when there is no Sub Total to compare with. While the bill is locked after a
 * scan it also offers an escape hatch to split anyway.
 */
export default function ReconcileRow(
  { reconciliation, locked, onContinue }: ReconcileRowProps
): ReactElement {
  const { status } = reconciliation;
  return (
    <div className={`reconcile reconcile--${status}`} role="status">
      <span className="reconcile__text">{reconcileMessage(reconciliation)}</span>
      {locked && status !== 'balanced' && (
        <button type="button" className="reconcile__continue" onClick={onContinue}>
          Continue anyway
        </button>
      )}
    </div>
  );
}
