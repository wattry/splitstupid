import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import {
  TIP_OPTIONS,
  BASIS_OPTIONS,
  WTF_TIP,
  PRINCIPLES_MESSAGE,
} from './lib/constants.js'
import { parseItems } from './lib/parseItems.js'
import { calculate } from './lib/calculate.js'

const money = (n) => `$${n.toFixed(2)}`;
const percent = (n) => `${(n * 100).toFixed(2)} %`;

const CustomTip = (props) => {
  const { customTipPct, setCustomTip, isWtf } = props;

  useEffect(() => {
    if (isWtf) {
      setCustomTip(20);
    }

    return () => setCustomTip(0);
  }, []);

  return <div className="field">
    <label htmlFor="custom_tip">Custom Tip (%)</label>
    <input
      id="tax"
      type="number"
      inputMode="decimal"
      min="0"
      step="1"
      placeholder="1.00"
      value={customTipPct}
      onChange={(e) => setCustomTip(e.target.value)}
    />
  </div>
};

export default function App() {
  const [stateTax, setStateTax] = useState(5);
  const [localTax, setLocalTax] = useState(0);
  const [customTipPct, setCustomTip] = useState(0);
  const [tipLabel, setTipLabel] = useState(TIP_OPTIONS[2].label) // default 15%
  const [basisLabel, setBasisLabel] = useState(BASIS_OPTIONS[1].label)
  const [itemsText, setItemsText] = useState('')
  const itemsRef = useRef(null);

  const tipOption = TIP_OPTIONS.find((o) => o.label === tipLabel) ?? TIP_OPTIONS[2]
  const basisOption =
    BASIS_OPTIONS.find((o) => o.label === basisLabel) ?? BASIS_OPTIONS[0]
  const isWtf = tipLabel === WTF_TIP
  const items = parseItems(itemsText)
  const result = calculate({
    items,
    stateTax: parseFloat(stateTax),
    localTax: parseFloat(localTax),
    customTipPct: parseFloat(customTipPct),
    tipPct: tipOption.value,
    preTax: basisOption.preTax,
  });

  // Auto-grow the items textarea so every line stays visible without scrolling.
  useLayoutEffect(() => {
    const el = itemsRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [itemsText])

  const hasGarbage = itemsText.trim().length > 0 && items.length === 0

  return (
    <main className="app">
      <section className="card">
        <header className="card__head">
          <h1 className="title">Split Stoopid</h1>
          <p className="subtitle">figure out what you actually owe</p>
        </header>

        <div className="field">
          <label htmlFor="state_tax">State Tax (%)</label>
          <input
            id="state_tax"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            placeholder="5"
            value={stateTax}
            onChange={(e) => setStateTax(e.target.value)}
          />
        </div>
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

        <div className="field">
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
        </div>

        <div className="field">
          <label htmlFor="items">Your items (space-separated prices)</label>
          <textarea
            id="items"
            ref={itemsRef}
            inputMode="decimal"
            rows={2}
            placeholder="12.50 8 4.25"
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
          />
          {hasGarbage && (
            <span className="hint">No valid prices found — try numbers like "12.50 8".</span>
          )}
        </div>

        <div className={`result ${isWtf ? 'result--wtf' : ''}`}>
          {isWtf ? (
            <p className="principles">{PRINCIPLES_MESSAGE}</p>
          ) : null}

          <dl className="breakdown">
            <div className="row">
              <dt>Your Total</dt>
              <dd>{money(result.subtotal)}</dd>
            </div>
            <div className="row">
              <dt>State Tax</dt>
              <dd>+ {money(result.taxAmt)}</dd>
            </div>
            {localTax > 0 && <div className="row">
              <dt>Local Tax</dt>
              <dd>+ {money(result.localTaxAmt)}</dd>
            </div>}
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
  )
}
