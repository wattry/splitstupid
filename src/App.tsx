import React, { useEffect, useRef, useState } from 'react';
import {
  calculate,
  round2,
  money,
  percent
} from './lib/calculate.js';
import ScanReceipt from './ScanReceipt.js';
import ItemRows, { rowOwed } from './ItemRows.js';
import type { Item, ItemFields, ParsedTotals } from './types.js';
import { Calculator } from './components/inputs/Calculator.js';
import { FeeCalculator } from './components/inputs/FeeCalculator.js';

import { login, splitClient } from './lib/splitwise.js';
import { encodeState, decodeState } from './lib/shareLink.js';
import { buildShareText, shareBill } from './lib/share.js';
import { VenmoModal } from './components/inputs/VenmoModal.js';

const Split = () => {
  const onClick = async () => {
    await login();
  };
  return (<button
    style={{ display: 'none' }}
    type="button"
    className="action-btn"
    onClick={onClick}
  >
    Splitwise
  </button>);
};

export default function App() {
  const [billName, setBillName] = useState<string>('');
  const [billSubtotal, setBillSubtotal] = useState<string>('');
  const [totalTax, setTotalTax] = useState<string>('');
  // True when the tax total came from more than one itemised fee.
  const [hasFees, setHasFees] = useState(false);
  const taxLabel = hasFees ? 'Tax + Fees' : 'Tax';
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
    const row = { id: crypto.randomUUID(), units: '1', yours: '1', desc: '', price: '', ...fields };
    // "Yours" defaults to the "Total" (units) unless the caller set it explicitly.
    if (fields.yours === undefined) row.yours = row.units;
    return row;
  }

  // Prefill the whole-bill fields from a receipt scan; missing fields untouched.
  const applyTotals = ({ subtotal, tax, tip }: ParsedTotals) => {
    if (subtotal !== undefined) setBillSubtotal(String(subtotal));
    if (tax !== undefined) setTotalTax(String(tax));
    if (tip !== undefined) setTipAmount(String(tip));
  };

  // true => Price column is per single unit; false => Price is total for all units.
  const [perUnit, setPerUnit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState<'' | 'Shared' | 'Link Copied'>('');
  const importRef = useRef<HTMLInputElement>(null);

  // Populate the form from a shared link (#s=...), then strip the hash so
  // refreshes and later edits don't resurrect stale data.
  useEffect(() => {
    const encoded = window.location.hash.match(/^#s=(.+)$/)?.[1];
    if (!encoded) return;
    decodeState(encoded).then((data) => {
      if (!data) return;
      setBillName(data.billName);
      setBillSubtotal(data.billSubtotal);
      setTotalTax(data.totalTax);
      setTipAmount(data.tipAmount);
      setPerUnit(data.perUnit);
      setItems(data.items);
    });
    history.replaceState(null, '', window.location.pathname + window.location.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Link carrying the whole form (minus any photo); shared and put in the Venmo note.
  const buildShareUrl = async () => {
    const encoded = await encodeState({ billName, billSubtotal, totalTax, tipAmount, perUnit, items });
    return `${window.location.origin}${window.location.pathname}#s=${encoded}`;
  };

  // Keep a current share URL around so the Venmo note can include it.
  const [shareUrl, setShareUrl] = useState('');
  useEffect(() => {
    let live = true;
    buildShareUrl().then((url) => { if (live) setShareUrl(url); }).catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billName, billSubtotal, totalTax, tipAmount, perUnit, items]);

  // Open the device share sheet with the link and a totals summary; browsers
  // without Web Share get the link copied to the clipboard instead. Uses the
  // precomputed URL so the share call stays inside the click's user activation.
  const shareLink = async () => {
    const url = shareUrl || (await buildShareUrl());
    const text = buildShareText({ name: billName, taxPct, tipPct, hasFees, ...result });
    const outcome = await shareBill({ text, url });
    if (outcome === 'shared' || outcome === 'copied') {
      setShared(outcome === 'shared' ? 'Shared' : 'Link Copied');
      setTimeout(() => setShared(''), 1500);
    }
  }

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

  // Export every input to a JSON file the user can re-import later.
  const saveForm = () => {
    const data = { version: 1, billSubtotal, totalTax, tipAmount, perUnit, items };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'split-stoopid.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Load inputs from a previously saved JSON file.
  const importForm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (typeof data.billSubtotal === 'string') setBillSubtotal(data.billSubtotal);
        if (typeof data.totalTax === 'string') setTotalTax(data.totalTax);
        if (typeof data.tipAmount === 'string') setTipAmount(data.tipAmount);
        if (typeof data.perUnit === 'boolean') setPerUnit(data.perUnit);
        if (Array.isArray(data.items) && data.items.length > 0) setItems(data.items);
      } catch {
        // Not a valid save file — ignore.
      }
    };
    reader.readAsText(file);
  }

  // Copy the owed amount to the clipboard, flashing "Copied" briefly.
  const copyOwed = async () => {
    try {
      await navigator.clipboard.writeText(money(result.total));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — silently ignore.
    }
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

  // Note attached to a Venmo payment: the bill name (or app name) plus the share link.
  const venmoNote = [billName.trim() || 'Split Stoopid', shareUrl].filter(Boolean).join(' ');

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
          onTotals={applyTotals}
          hasTotals={Boolean(billSubtotal || totalTax || tipAmount)}
        />

        <div className="field">
          <label htmlFor="bill_name">Name</label>
          <input
            id="bill_name"
            type="text"
            autoComplete="off"
            placeholder="Dinner at Thai Place"
            value={billName}
            onChange={(e) => setBillName(e.target.value)}
          />
        </div>

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
          <span className="field__label">Are line items a Total for all or a price for one?</span>
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
          <label htmlFor="total_tax">Total Taxes & Fees ($)</label>
          <div className="field__inline">
            <input
              id="total_tax"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              placeholder="0.00"
              value={totalTax}
              onChange={(e) => {
                setTotalTax(e.target.value);
                setHasFees(false);
              }}
            />
            <FeeCalculator
              onApply={(total, count) => {
                setTotalTax(total);
                setHasFees(count > 1);
              }}
            />
          </div>
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
            <div className="row">
              <dt>{taxLabel} ({taxPct.toFixed(2)}%)</dt>
              <dd>+ {money(result.taxAmt)}</dd>
            </div>
            <hr />
            <div className="row">
              <dt>After Tax Total</dt>
              <dd>{money(result.afterTax)}</dd>
            </div>
            <hr />
            <div className="row">
              <dt>Tip ({tipPct.toFixed(2)}%)</dt>
              <dd>+ {money(result.tipAmt)}</dd>
            </div>
            <hr />
            {result.effectiveTip > 0 && <div className="row">
              <dt>Actual Tip % on Total</dt>
              <dd>{percent(result.effectiveTip)}</dd>
            </div>}
          </dl>

          <div className="total">
            <span className="total__label">What U Owe</span>
            <span key={result.total} className="total__value">
              {money(result.total)}
            </span>
            <button
              type="button"
              className="copy-btn"
              onClick={copyOwed}
              aria-label="Copy amount owed"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="actions">
            <button type="button" className="action-btn" onClick={shareLink}>
              {shared || 'Share'}
            </button>
            <button
              style={{ display: 'none' }} // hide this. With the share feature we don't need to expose these to users
              type="button"
              className="action-btn"
              onClick={saveForm}>
              Save
            </button>
            <button
              style={{ display: 'none' }} // hide this. With the share feature we don't need to expose these to users
              type="button"
              className="action-btn"
              onClick={() => importRef.current?.click()}
            >
              Import
            </button>
            <input
              style={{ display: 'none' }} // hide this. With the share feature we don't need to expose these to users
              ref={importRef}
              type="file"
              accept="application/json,.json"
              onChange={importForm}
              hidden
            />
            <VenmoModal
              amount={result.total}
              note={venmoNote}
            />
            <Split />
          </div>

          <footer className="footer">
            <a className="footer__link" href="https://postnesia.app/">
              © {new Date().getFullYear()} Ryan Wattrus
            </a>
          </footer>
        </div>
      </section>

      <Calculator />
    </main>
  );
}
