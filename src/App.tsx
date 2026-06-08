import React, { useState } from 'react';
import {
  calculate,
  round2,
  money,
  percent
} from './lib/calculate.js';
import ScanReceipt from './ScanReceipt.js';
import ItemRows, { rowOwed } from './ItemRows.js';
import type { Item, ItemFields } from './types.js';

export default function App() {
  const [billSubtotal, setBillSubtotal] = useState<string>('');
  const [totalTax, setTotalTax] = useState<string>('');
  const [tipAmount, setTipAmount] = useState<string>('');
  const [items, setItems] = useState<Item[]>(() => [makeRow()]);

  /**
   * Build a blank row. `fields` can prefill units/yours/desc/price.
   * Each row gets a unique id so rows stay independent even when several are
   * created in the same render (e.g. a receipt scan).
   * @param {Partial<Row>} fields
   * @returns {Row}
   */
  function makeRow(fields: ItemFields = {}): Item {
    return { id: crypto.randomUUID(), units: '1', yours: '1', desc: '', price: '', ...fields };
  }

  // true => Price column is per single unit; false => Price is total for all units.
  const [perUnit, setPerUnit] = useState(false);

  // Flip the toggle, converting each row's Price so the amount owed stays put.
  const togglePerUnit = () => {
    setItems(
      items.map((item) => {
        const units = parseFloat(item.units) || 1
        const price = parseFloat(item.price) || 0
        const next = perUnit ? price * units : units ? price / units : price
        return { ...item, price: String(round2(next)) }
      })
    )
    setPerUnit(!perUnit);
  }

  // Tax and tip expressed as a percent of the whole-bill subtotal (for helper text).
  const subNum = parseFloat(billSubtotal) || 0;
  const taxPct = subNum > 0 ? ((parseFloat(totalTax) || 0) / subNum) * 100 : 0;
  const tipPct = subNum > 0 ? ((parseFloat(tipAmount) || 0) / subNum) * 100 : 0;

  // Each row owes the amount attributable to the user under the current mode.
  const prices = items.map((it) => rowOwed(it, perUnit));
  const result = calculate({
    items: prices,
    billSubtotal: parseFloat(billSubtotal),
    totalTax: parseFloat(totalTax),
    tipAmt: parseFloat(tipAmount),
  });

  return (
    <main className="app">
      <section className="card">
        <header className="card__head">
          <h1 className="title">Split Stoopid</h1>
          <p className="subtitle">figure out what you actually owe</p>
        </header>

        <ScanReceipt
          items={items}
          setItems={setItems}
          perUnit={perUnit}
          makeRow={makeRow}
        />

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

        <ItemRows
          items={items}
          setItems={setItems}
          perUnit={perUnit}
          makeRow={makeRow}
        />

        <div className="field">
          <label htmlFor="sub_total">Sub Total ($)</label>
          <input
            id="sub_total"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            placeholder="0.00"
            value={billSubtotal}
            onChange={(e) => setBillSubtotal(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="total_tax">Total Tax ($)</label>
          <input
            id="total_tax"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            placeholder="0.00"
            value={totalTax}
            onChange={(e) => setTotalTax(e.target.value)}
          />
          {subNum > 0 && <span className="hint hint--muted">
            {taxPct.toFixed(2)}%
          </span>}
        </div>

        <div className="field">
          <label htmlFor="tip">Tip ($)</label>
          <input
            id="tip"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            placeholder="0.00"
            value={tipAmount}
            onChange={(e) => setTipAmount(e.target.value)}
          />
          {subNum > 0 && <span className="hint hint--muted">
            {tipPct.toFixed(2)}%
          </span>}
        </div>

        <div className="result">
          <dl className="breakdown">
            <div className="row">
              <dt>Your Total</dt>
              <dd>{money(result.subtotal)}</dd>
            </div>
            <hr />
            {result.taxAmt > 0 && <div className="row">
              <dt>Tax</dt>
              <dd>+ {money(result.taxAmt)}</dd>
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
