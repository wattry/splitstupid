import { useState } from 'react'
import {
  TIP_OPTIONS,
  BASIS_OPTIONS,
  WTF_TIP,
  PRINCIPLES_MESSAGE,
} from './lib/constants.js'
import { parseItems } from './lib/parseItems.js'
import { calculate } from './lib/calculate.js'

const money = (n) => `$${n.toFixed(2)}`

export default function App() {
  const [stateTax, setStateTax] = useState('')
  const [tipLabel, setTipLabel] = useState(TIP_OPTIONS[2].label) // default 15%
  const [basisLabel, setBasisLabel] = useState(BASIS_OPTIONS[0].label)
  const [itemsText, setItemsText] = useState('')

  const tipOption = TIP_OPTIONS.find((o) => o.label === tipLabel) ?? TIP_OPTIONS[2]
  const basisOption =
    BASIS_OPTIONS.find((o) => o.label === basisLabel) ?? BASIS_OPTIONS[0]
  const isWtf = tipLabel === WTF_TIP

  const items = parseItems(itemsText)
  const result = calculate({
    items,
    stateTax: parseFloat(stateTax),
    tipPct: tipOption.value,
    preTax: basisOption.preTax,
  })

  const hasGarbage = itemsText.trim().length > 0 && items.length === 0

  return (
    <main className="app">
      <section className="card">
        <header className="card__head">
          <h1 className="title">splitstupid</h1>
          <p className="subtitle">figure out what you actually owe</p>
        </header>

        <div className="field">
          <label htmlFor="tax">State Tax (%)</label>
          <input
            id="tax"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="8.25"
            value={stateTax}
            onChange={(e) => setStateTax(e.target.value)}
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
          <input
            id="items"
            type="text"
            inputMode="decimal"
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
              <dt>Subtotal</dt>
              <dd>{money(result.subtotal)}</dd>
            </div>
            <div className="row">
              <dt>Tax</dt>
              <dd>{money(result.taxAmt)}</dd>
            </div>
            <div className="row">
              <dt>Tip</dt>
              <dd>{money(result.tipAmt)}</dd>
            </div>
          </dl>

          <div className="total">
            <span className="total__label">You owe</span>
            <span key={result.total} className="total__value">
              {money(result.total)}
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}
