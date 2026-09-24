import React, { useEffect, useRef, useState } from 'react';
import { usePostHog } from '@posthog/react';
import { initialState, input, keyToCalcKey } from '../../lib/calculator.js';
import { CalculatorIcon } from '../Icons.js';

// A floating calculator button that opens a plain calculator modal for quick math.
export const Calculator = () => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(initialState);
  const posthog = usePostHog();
  // Per-session usage, reported when the modal closes.
  const usage = useRef({ keys_pressed: 0, evaluated: false });

  const openModal = () => {
    usage.current = { keys_pressed: 0, evaluated: false };
    posthog.capture('calculator_opened', {});
    setOpen(true);
  };
  const closeModal = (via: 'close' | 'backdrop') => {
    posthog.capture('calculator_closed', { ...usage.current, via });
    setOpen(false);
  };

  const press = (key: string) => {
    usage.current.keys_pressed += 1;
    if (key === '=') usage.current.evaluated = true;
    setState((s) => input(s, key));
  };

  // Desktop: type into the calculator. Escape clears; a second Escape on a
  // cleared display closes the modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const key = keyToCalcKey(e);
      if (key === null) return;
      e.preventDefault();
      if (e.key === 'Escape' && state.display === '0' && state.op === null) {
        closeModal('close');
        return;
      }
      press(key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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
        onClick={openModal}
        aria-label="Open calculator"
      >
        <CalculatorIcon />
      </button>

      {open && (
        <div
          className="calc"
          role="dialog"
          aria-label="Calculator"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal('backdrop');
          }}
        >
          <div className="calc__card" tabIndex={-1} ref={(el) => el?.focus()}>
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
              onClick={() => closeModal('close')}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
