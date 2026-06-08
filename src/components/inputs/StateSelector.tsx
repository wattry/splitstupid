import React, { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import stateTaxRates from '../../lib/stateTaxRates.json' with { type: 'json' };
import { useIPLocation } from '../../hooks/location.js';

interface StateTaxRate {
  state: string;
  value: number;
}

interface StateTaxInput {
  state: string;
  value: number | string;
}

interface StateSelectorProps {
  /** Selected tax rate (the chosen entry's `value`). */
  value: StateTaxInput;
  /** State setter from useState that holds the selected `value`. */
  setValue: Dispatch<SetStateAction<StateTaxInput>>;
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
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const entry = rates.find((r) => r.state === e.target.value);
    if (!entry) return;
    setValue({ state: entry.state, value: entry.value });
    onSelect?.(entry);
  };

  useEffect(() => {
    console.log(location.state);

    if (location.state) {
      setValue({ state: location.state, value: location.salesTax });
    }

    return () => {
      setValue({ state: '', value: 5 });
    };
  }, [location]);

  if (!location.state) {
    return (<></>);
  }

  // value holds the rate; map it back to a state abbrev for the controlled select.
  const selected = rates.find((r) => r.state === value.state)?.state ?? '';

  console.log('value', value, selected);

  return (
    <div className="field">
      <label htmlFor="state_selector">State Tax (%)</label>
      <select id="state_selector" value={selected} onChange={handleChange}>
        <option value="" disabled>
          Select a state
        </option>
        {rates.map((r) => (
          <option key={r.state} value={r.state}>
            {r.state} ({(r.value * 100).toFixed(2)}%)
          </option>
        ))}
      </select>
      <span className="field__label">Based on current location &#128205;</span>
    </div>
  );
}
