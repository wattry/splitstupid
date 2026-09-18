import React, { useState } from 'react';
import { initialState, input } from '../../lib/calculator.js';

// A floating 🧮 button that opens a plain calculator modal for quick math.
export const Calculator = () => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(initialState);

  const press = (key: string) => setState((s) => input(s, key));

  const keys: string[][] = [
    ['C', '⌫', '/', '*'],
    ['7', '8', '9', '-'],
    ['4', '5', '6', '+'],
    ['1', '2', '3', '='],
    ['0', '.']
  ];

  const label = (key: string) =>
    ({ '/': '÷', '*': '×', '-': '−' })[key] ?? key;

  return (
    <>
      <button
        type="button"
        className="fab"
        onClick={() => setOpen(true)}
        aria-label="Open calculator"
      >
        🧮
      </button>

      {open && (
        <div
          className="calc"
          role="dialog"
          aria-label="Calculator"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="calc__card">
            <output className="calculator__display" aria-live="polite">
              {state.display}
            </output>

            <div className="calculator__keys">
              {keys.flat().map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`calculator__key${/^[\d.]$/.test(key) ? '' : ' calculator__key--op'}${key === '=' ? ' calculator__key--eq' : ''}${key === '0' ? ' calculator__key--zero' : ''}`}
                  onClick={() => press(key)}
                >
                  {label(key)}
                </button>
              ))}
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
