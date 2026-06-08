import React, { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import stateTaxRates from '../../lib/stateTaxRates.json' with { type: 'json' };
import { useIPLocation } from '../../hooks/location.js';
import type { StateTaxSelection } from '../../types.js';
import { CircularLoading } from '../CircularLoading.js';

interface StateTaxRate {
  state: string;
  value: number;
}

interface StateSelectorProps {
  /** Selected tax rate (the chosen entry's `value`). */
  value: StateTaxSelection;
  /** State setter from useState that holds the selected `value`. */
  setValue: Dispatch<SetStateAction<StateTaxSelection>>;
  /** Fired with the full entry whenever a state is picked. */
  onSelect?: (entry: StateTaxRate) => void;
}

const rates = stateTaxRates as StateTaxRate[];

export function StateSelector({
  value,
  setValue,
  onSelect
}: StateSelectorProps) {
  const location = useIPLocation();
  // Rates are stored as fractions (0.04); the tax input works in percent (4).
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const entry = rates.find((r) => r.state === e.target.value);
    if (!entry) return;
    setValue({ state: entry.state, value: entry.value * 100 });
    onSelect?.(entry);
  };

  useEffect(() => {
    if (location.state) {
      setValue({ state: location.state, value: location.salesTax * 100 });
    }

    return () => {
      setValue({ state: '', value: 0 });
    };
  }, [location]);

  if (location.isLoading) {
    return <CircularLoading />;
  }

  // value holds the rate; map the picked state back to its abbrev for the select.
  const selected = rates.find((r) => r.state === value.state)?.state ?? '';

  return (
    <>
      <div className="field">
        <label htmlFor="state_selector">State</label>
        <select id="state_selector" value={selected} onChange={handleChange}>
          <option value="" disabled>
            Select a state
          </option>
          {rates.map((r: StateTaxRate) => (
            <option key={r.state} value={r.state}>
              {r.state} ({(r.value * 100).toFixed(2)}%)
            </option>
          ))}
        </select>
        {location.text && <span className="field__label">{location.text} &#128205;</span>}
      </div>

      <div className="field">
        <label htmlFor="state_tax">State Tax (%)</label>
        <input
          id="state_tax"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={value.value}
          onChange={(e) => setValue((prev) => ({ ...prev, value: e.target.value }))}
        />
        <span className="field__label">Defaults from the selected state — edit if yours differs</span>
      </div>
    </>
  );
}
