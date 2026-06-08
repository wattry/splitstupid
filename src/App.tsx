import React, { useState } from 'react';
import {
  TIP_OPTIONS,
  BASIS_OPTIONS,
  WTF_TIP,
  FLAT_TIP
} from './lib/constants.js';
import {
  calculate,
  round2,
  money,
  percent
} from './lib/calculate.js';
import ScanReceipt from './ScanReceipt.js';
import ItemRows, { rowOwed } from './ItemRows.js';
import type { Item } from './ItemRows.js';
import { StateSelector } from './components/inputs/StateSelector.js';
import { CustomTip } from './components/inputs/CustomTip.js';
import { FlatTip } from './components/inputs/FlatTip.js';

export default function App() {
  const [stateTax, setStateTax] = useState<{ state: string, value: number | string }>({ state: '', value: 5 });
  const [localTax, setLocalTax] = useState<number | string>(0);
  const [customTipPct, setCustomTip] = useState<number>(0);
  const [tipLabel, setTipLabel] = useState<string>(TIP_OPTIONS[5].label); // default 15%
  const [basisLabel, setBasisLabel] = useState<string>(BASIS_OPTIONS[1].label);
  const [items, setItems] = useState<Item[]>([]);

  /**
   * Build a blank row. `fields` can prefill units/yours/desc/price.
   * @param {Partial<Row>} fields
   * @returns {Row}
   */
  function makeRow(fields: Partial<Omit<Item, 'id'>> = {}): Item {
    return { id: `row-${items.length}`, units: 1, yours: 1, desc: '', price: '', ...fields };
  }

  // true => Price column is per single unit; false => Price is total for all units.
  const [perUnit, setPerUnit] = useState(false);
  // Flat-tip mode inputs (used only when the FLAT_TIP option is selected).
  const [tipAmount, setTipAmount] = useState<string>('');
  const [finalTotal, setFinalTotal] = useState<string>('');

  // Flip the toggle, converting each row's Price so the amount owed stays put.
  const togglePerUnit = () => {
    setItems(
      items.map((item) => {
        const units = parseFloat(item.units) || 1
        const price = parseFloat(item.price) || 0
        const next = perUnit ? price * units : units ? price / units : price
        return { ...it, price: round2(next) }
      })
    )
    setPerUnit(!perUnit);
  }

  const tipOption = TIP_OPTIONS.find((o) => o.label === tipLabel) ?? TIP_OPTIONS[2];
  const basisOption = BASIS_OPTIONS.find((o) => o.label === basisLabel) ?? BASIS_OPTIONS[0];
  const isWtf = tipLabel === WTF_TIP;
  const isFlat = tipLabel === FLAT_TIP;

  // Flat-tip mode: derive the rate from the tip amount and final total.
  // rate = tip / (after-tax bill) = tip / (finalTotal - tip).
  const billAfterTax = (parseFloat(finalTotal) || 0) - (parseFloat(tipAmount) || 0);
  const flatRate = isFlat && billAfterTax > 0 ? ((parseFloat(tipAmount) || 0) / billAfterTax) * 100 : 0;

  // Each row owes the amount attributable to the user under the current mode.
  const prices = items.map((it) => rowOwed(it, perUnit));
  const result = calculate({
    items: prices,
    stateTax: parseFloat(stateTax.value),
    localTax: parseFloat(localTax),
    customTipPct: isFlat ? 0 : parseFloat(customTipPct),
    tipPct: isFlat ? flatRate : tipOption.value,
    // Flat tip already sits on the after-tax bill, so tip on the after-tax base.
    preTax: isFlat ? false : basisOption.preTax,
    flatTip: isFlat,
  });

  return (
    <main className="app">
      <section className="card">
        <header className="card__head">
          <h1 className="title">Split Stoopid</h1>
          <p className="subtitle">figure out what you actually owe</p>
        </header>
        <StateSelector value={stateTax} setValue={setStateTax} onSelect={(e) => console.log(e.state)} />

        <div className="field">
          <label htmlFor="local_tax">Local Tax (%)</label>
          <input
            id="local_tax"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            placeholder="1.00"
            value={localTax}
            onChange={(e) => setLocalTax(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="tip">Tip</label>
          <select id="tip" value={tipLabel} onChange={(e) => setTipLabel(e.target.value)}>
            {TIP_OPTIONS.map((o) => (
              <option key={o.label} value={o.label}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {isWtf && <CustomTip
          customTipPct={customTipPct}
          setCustomTip={setCustomTip}
          isWtf={isWtf} />}

        {isFlat && <FlatTip
          tipAmount={tipAmount}
          setTipAmount={setTipAmount}
          finalTotal={finalTotal}
          setFinalTotal={setFinalTotal}
          rate={flatRate} />}

        {!isFlat && <div className="field">
          <label htmlFor="basis">Tip Basis</label>
          <select
            id="basis"
            value={basisLabel}
            onChange={(e) => setBasisLabel(e.target.value)}
          >
            {BASIS_OPTIONS.map((o) => (
              <option key={o.label} value={o.label}>
                {o.label}
              </option>
            ))}
          </select>
        </div>}

        <div className="field toggle">
          <span className="field__label">Line Item Pricing</span>
          <button
            type="button"
            className="toggle__btn"
            role="switch"
            aria-checked={perUnit}
            onClick={togglePerUnit}
          >
            <span className={!perUnit ? 'toggle__on' : ''}>Total Per Item</span>
            <span className={perUnit ? 'toggle__on' : ''}>Per Item</span>
          </button>
          <span className="field__label">Are  line items listed as a totals or per item?</span>
        </div>

        <ScanReceipt
          items={items}
          setItems={setItems}
          perUnit={perUnit}
          makeRow={makeRow}
        />

        <ItemRows
          items={items}
          setItems={setItems}
          perUnit={perUnit}
          makeRow={makeRow}
        />

        <div className={`result ${isWtf ? 'result--wtf' : ''}`}>
          <dl className="breakdown">
            <div className="row">
              <dt>Your Total</dt>
              <dd>{money(result.subtotal)}</dd>
            </div>
            <hr />
            <div className="row">
              <dt>State Tax</dt>
              <dd>+ {money(result.taxAmt)}</dd>
            </div>
            {localTax > 0 && <div className="row">
              <dt>Local Tax</dt>
              <dd>+ {money(result.localTaxAmt)}</dd>
            </div>}
            <hr />
            <div className="row">
              <dt>After Tax Total</dt>
              <dd>{money(result.afterTax)}</dd>
            </div>
            <hr />
            <div className="row">
              <dt>Tip</dt>
              <dd>+ {money(result.tipAmt)}</dd>
            </div>
            <hr />
            {result.effectiveTip > 0 && <div className="row">
              <dt>Actual Tip % on Total</dt>
              <dd>{percent(result.effectiveTip)}</dd>
            </div>}
          </dl>

          <div className="total">
            <span className="total__label">What You owe</span>
            <span key={result.total} className="total__value">
              {money(result.total)}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
