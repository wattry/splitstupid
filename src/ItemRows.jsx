const money = (n) => `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`

/**
 * Amount of a row attributable to the user.
 *  - per-unit mode:  yours × price
 *  - total mode:     price × (yours / units)
 *
 * @param {Row} row
 * @param {boolean} perUnit
 * @returns {number}
 */
export function rowOwed(row, perUnit) {
  const yours = parseFloat(row.yours) || 0
  const price = parseFloat(row.price) || 0
  if (perUnit) return yours * price
  const units = parseFloat(row.units) || 0
  return units > 0 ? price * (yours / units) : 0
}

/**
 * Editable list of receipt line items. Each row is Units / Yours / Description /
 * Price, plus a remove button and the amount owed by the user. "Units" is the
 * count on the receipt; "Yours" is how many you actually had. Whether Price is
 * per-unit or a total for all units is governed by the parent's `perUnit` flag.
 *
 * @param {{ items: Row[], setItems: (rows: Row[]) => void, perUnit: boolean }} props
 * @typedef {{ id: string, units: number|string, yours: number|string, desc: string, price: number|string }} Row
 */
export default function ItemRows({ items, setItems, perUnit }) {
  const update = (id, field, value) =>
    setItems(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)))

  const remove = (id) => {
    const next = items.filter((it) => it.id !== id)
    setItems(next.length ? next : [makeRow()])
  }

  const add = () => setItems([...items, makeRow()])

  const clear = () => setItems([makeRow()])

  return (
    <div className="field">
      <span className="field__label">Your items</span>

      <div className="items">
        <div className="items__head">
          <span>Total</span>
          <span>Yours</span>
          <span>Description</span>
          <span>{perUnit ? 'Each' : 'Total'}</span>
          <span aria-hidden="true" />
        </div>

        {items.map((it) => (
          <div className="items__row" key={it.id}>
            <div className="items__grid">
              <input
                className="items__num"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={it.units}
                onChange={(e) => update(it.id, 'units', e.target.value)}
                aria-label="Units on receipt"
              />
              <input
                className="items__num"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={it.yours}
                onChange={(e) => update(it.id, 'yours', e.target.value)}
                aria-label="How many you had"
              />
              <input
                className="items__desc"
                type="text"
                placeholder="item"
                value={it.desc}
                onChange={(e) => update(it.id, 'desc', e.target.value)}
                aria-label="Description"
              />
              <input
                className="items__price"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={it.price}
                onChange={(e) => update(it.id, 'price', e.target.value)}
                aria-label={perUnit ? 'Price each' : 'Total for all units'}
              />
              <button
                type="button"
                className="items__remove"
                onClick={() => remove(it.id)}
                aria-label="Remove item"
              >
                ×
              </button>
            </div>
            <span className="items__owe">you owe {money(rowOwed(it, perUnit))}</span>
          </div>
        ))}
      </div>

      <div className="items__actions">
        <button type="button" className="items__add" onClick={add}>
          + Add item
        </button>
        <button type="button" className="items__clear" onClick={clear}>
          Clear
        </button>
      </div>
    </div>
  )
}

let seq = 0
/**
 * Build a blank row. `fields` can prefill units/yours/desc/price.
 * @param {Partial<Row>} [fields]
 * @returns {Row}
 */
export function makeRow(fields = {}) {
  seq += 1
  return { id: `row-${seq}`, units: 1, yours: 1, desc: '', price: '', ...fields }
}
