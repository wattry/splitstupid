import React, { useState } from 'react';
import { money } from '../../lib/calculate.js';
import { venmoLink } from '../../lib/venmo.js';

interface Props {
  /** Amount to pay or request. */
  amount: number;
  /** Note attached to the Venmo transaction. */
  note: string;
}

// A "Venmo" action button that opens a small modal where the user picks
// whether to Pay or Request the amount owed; they choose the other person in
// Venmo. Links are universal links, so the OS opens the Venmo app when
// installed and venmo.com otherwise.
export const VenmoModal = ({ amount, note }: Props) => {
  const [open, setOpen] = useState(false);
  const ready = amount > 0;
  const href = (txn: 'pay' | 'charge') =>
    ready ? venmoLink({ txn, amount, note }) : undefined;

  return (
    <>
      <button type="button" className="action-btn" onClick={() => setOpen(true)}>
        Venmo
      </button>

      {open && (
        <div
          className="calc"
          role="dialog"
          aria-label="Venmo"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="calc__card">
            <output className="calculator__display" aria-live="polite">
              {money(amount)}
            </output>

            <div className="venmo__links">
              <a
                className="action-btn"
                href={href('pay')}
                aria-disabled={!ready}
                target="_blank"
                rel="noopener noreferrer"
              >
                Pay
              </a>
              <a
                className="action-btn"
                href={href('charge')}
                aria-disabled={!ready}
                target="_blank"
                rel="noopener noreferrer"
              >
                Request
              </a>
            </div>

            <button
              type="button"
              className="scan-btn scan-btn--ghost calculator__close"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
