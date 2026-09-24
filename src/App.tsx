import React, { useEffect, useRef, useState } from 'react';
import {
  calculate,
  round2,
  money
} from './lib/calculate.js';
import ScanReceipt from './ScanReceipt.js';
import ItemRows, { rowOwed } from './ItemRows.js';
import type { Fee, Item, ItemFields, ParsedTotals, Participant } from './types.js';
import { useFriends } from './hooks/useFriends.js';
import { FriendsManager } from './components/FriendsManager.js';
import { ParticipantChips } from './components/ParticipantChips.js';
import { removeParticipant, syncRename, toggleParticipant } from './lib/participants.js';
import { Calculator } from './components/inputs/Calculator.js';
import { FeeCalculator } from './components/inputs/FeeCalculator.js';
import { usePostHog } from '@posthog/react';
import { collapseFees, feeInputValue, feeTotal, isFeeList, isItemised } from './lib/fees.js';
import { TipHelper } from './components/inputs/TipHelper.js';

import { scannedBill } from './lib/formState.js';
import { exportFileName } from './lib/exportName.js';
import { encodeState, decodeState } from './lib/shareLink.js';
import { billTitle, buildShareText, shareBill } from './lib/share.js';
import { reconcile } from './lib/reconcile.js';
import { VenmoModal } from './components/inputs/VenmoModal.js';

export default function App() {
  const posthog = usePostHog();
  const [billName, setBillName] = useState<string>('');
  // Free text shown with the bill and sent along with the share link/text.
  const [note, setNote] = useState<string>('');
  // Raw OCR text of the last scan; shared in the link so others can check it.
  const [scanText, setScanText] = useState<string>('');
  const [billSubtotal, setBillSubtotal] = useState<string>('');
  // Itemised taxes and fees. The "Total Taxes & Fees" input is a view over
  // this list; typing into it collapses the list to a single "Tax" fee.
  const [fees, setFees] = useState<Fee[]>([]);
  const totalTax = feeInputValue(fees);
  const hasFees = isItemised(fees);
  const taxLabel = hasFees ? 'Tax + Fees' : 'Tax';
  const [tipAmount, setTipAmount] = useState<string>('');
  const [items, setItems] = useState<Item[]>(() => [makeRow()]);
  // Split Even: this user's share is an even slice of the line-item sum.
  const [splitEven, setSplitEven] = useState(false);
  const [partySize, setPartySize] = useState<string>('4');
  const [myParty, setMyParty] = useState<string>('2');

  // Your friends (persisted on this device) and who is on this bill. The
  // bill's list is a snapshot of names so a shared link carries it; scans
  // and links never touch the friend list.
  const { friends, add: addFriend, rename, remove } = useFriends();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [friendsOpen, setFriendsOpen] = useState(false);

  const renameFriend = (id: string, name: string) => {
    const result = rename(id, name);
    if (result.ok) setParticipants((list) => syncRename(list, id, result.friend.name));
    return result;
  };
  const deleteFriend = (id: string) => {
    remove(id);
    setParticipants((list) => removeParticipant(list, id));
  };
  const importFriend = (participant: Participant, name?: string) => {
    // Same check as importParticipant, but through the hook so it persists.
    const result = addFriend(name ?? participant.name, participant.id);
    if (result.ok) setParticipants((list) => syncRename(list, participant.id, result.friend.name));
    return result;
  };

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

  // A receipt scan replaces the whole bill, so values typed for a previous
  // receipt never mix with the new one. Fields the scan lacked come back blank.
  // Sanity-check messages from the last scan. Shown once, at import; later
  // edits are the user's call, so they are never recomputed.
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  // After a scan the split controls stay hidden until the line items add up to
  // the Sub Total (or the user chooses to continue anyway). Unlocking is
  // one-way: later edits never hide anything again. Hand-typed bills, imports
  // and shared links start unlocked.
  const [locked, setLocked] = useState(false);
  const applyScan = (totals: ParsedTotals, rows: Item[], warnings: string[]) => {
    const bill = scannedBill(totals, rows);
    setScanWarnings(warnings);
    setLocked(true);
    setBillName(bill.billName);
    setBillSubtotal(bill.billSubtotal);
    setFees(bill.fees);
    setTipAmount(bill.tipAmount);
    setSplitEven(bill.splitEven);
    setPartySize(bill.partySize);
    setMyParty(bill.myParty);
    setItems(bill.items);
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
      setNote(data.note);
      setScanText(data.scanText);
      setBillSubtotal(data.billSubtotal);
      setFees(data.fees);
      setTipAmount(data.tipAmount);
      setPerUnit(data.perUnit);
      setSplitEven(data.splitEven);
      setPartySize(data.partySize);
      setMyParty(data.myParty);
      setItems(data.items);
      setParticipants(data.participants);
    });
    history.replaceState(null, '', window.location.pathname + window.location.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Link carrying the whole form (minus any photo); shared and put in the Venmo note.
  const buildShareUrl = async () => {
    const encoded = await encodeState({
      billName, note, scanText, billSubtotal, fees, tipAmount, perUnit, splitEven, partySize, myParty,
      participants, items,
    });
    return `${window.location.origin}${window.location.pathname}#s=${encoded}`;
  };

  // Keep a current share URL around so the Venmo note can include it.
  const [shareUrl, setShareUrl] = useState('');
  useEffect(() => {
    let live = true;
    buildShareUrl().then((url) => { if (live) setShareUrl(url); }).catch(() => { });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billName, note, scanText, billSubtotal, fees, tipAmount, perUnit, splitEven, partySize, myParty, participants, items]);

  // Open the device share sheet with the link and a totals summary; browsers
  // without Web Share get the link copied to the clipboard instead. Uses the
  // precomputed URL so the share call stays inside the click's user activation.
  const shareLink = async () => {
    const url = shareUrl || (await buildShareUrl());
    const text = buildShareText({ name: billName, note, taxPct, tipPct, hasFees, ...result });
    const outcome = await shareBill({ text, url });
    if (outcome === 'shared' || outcome === 'copied') {
      setShared(outcome === 'shared' ? 'Shared' : 'Link Copied');
      setTimeout(() => setShared(''), 1500);
    }
  }

  // Turning Split Even on resets every row to Yours = Total so the line-item
  // sum is the whole bill before it is divided by the party.
  const toggleSplitEven = (on: boolean) => {
    if (on) setItems(items.map((item) => ({ ...item, yours: item.units })));
    setSplitEven(on);
  };

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
    const data = {
      version: 1, billName, note, scanText, billSubtotal, totalTax, fees, tipAmount, perUnit, items,
      participants,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(billName, 'json');
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
        if (typeof data.billName === 'string') setBillName(data.billName);
        if (typeof data.note === 'string') setNote(data.note);
        if (typeof data.scanText === 'string') setScanText(data.scanText);
        if (typeof data.billSubtotal === 'string') setBillSubtotal(data.billSubtotal);
        if (isFeeList(data.fees)) setFees(data.fees);
        else if (typeof data.totalTax === 'string') setFees(collapseFees(data.totalTax));
        if (typeof data.tipAmount === 'string') setTipAmount(data.tipAmount);
        if (typeof data.perUnit === 'boolean') setPerUnit(data.perUnit);
        if (Array.isArray(data.items) && data.items.length > 0) setItems(data.items);
        if (Array.isArray(data.participants)) {
          const clean = data.participants.filter((p: unknown): p is Participant => {
            if (typeof p !== 'object' || p === null) return false;
            const rec = p as Record<string, unknown>;
            return typeof rec['id'] === 'string' && typeof rec['name'] === 'string';
          });
          setParticipants(clean);
        }
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

  // Do the rows' full line totals add up to the Sub Total? Shown live under the
  // items; while locked, a balanced bill unlocks the split controls.
  const reconciliation = reconcile(items, perUnit, billSubtotal);
  useEffect(() => {
    if (locked && reconciliation.status === 'balanced') setLocked(false);
  }, [locked, reconciliation.status]);

  // Each row owes the amount attributable to the user under the current mode.
  const prices = items.map((it) => rowOwed(it, perUnit));
  const result = calculate({
    items: prices,
    billSubtotal: parseFloat(billSubtotal),
    totalTax: feeTotal(fees),
    tipAmt: parseFloat(tipAmount),
    ...(splitEven
      ? { split: { partySize: parseFloat(partySize), myParty: parseFloat(myParty) } }
      : {}),
  });

  // Note attached to a Venmo payment: the bill name (or app name) plus the share link.
  const venmoNote = [billTitle(billName), shareUrl].filter(Boolean).join(' ');

  return (
    <main className="app">
      <section className="card">
        <header className="card__head">
          <h1 className="title">Split Stoopid</h1>
          <p className="subtitle">Figure out what you actually owe</p>
        </header>

        <div className="field toggle">
          <span className="field__label">Line Item Pricing</span>
          <button
            type="button"
            className="toggle__btn"
            role="switch"
            aria-checked={perUnit}
            onClick={togglePerUnit}
          >
            <span className={!perUnit ? 'toggle__on' : ''}>Total Item Price</span>
            <span className={perUnit ? 'toggle__on' : ''}>Per Item Price</span>
          </button>
          <span className="field__label">Are lines showing a total for all items or the price for a single item?</span>
        </div>

        <div className="friends-bar">
          <button type="button" className="scan-btn scan-btn--camera" onClick={() => setFriendsOpen(true)}>
            {participants.length ? `Manage Friends (${participants.length})` : 'Manage Friends'}
          </button>
          <ParticipantChips
            participants={participants}
            friends={friends}
            onRemove={(id) => setParticipants((list) => removeParticipant(list, id))}
            onImport={importFriend}
          />
        </div>
        {friendsOpen && (
          <FriendsManager
            friends={friends}
            participants={participants}
            me={{ id: '', name: '' }}
            onToggle={(friend) => setParticipants((list) => toggleParticipant(list, friend))}
            onAdd={(name) => addFriend(name)}
            onRename={renameFriend}
            onRenameMe={() => ({ ok: false, error: 'empty' })}
            onDelete={deleteFriend}
            onClose={() => setFriendsOpen(false)}
          />
        )}

        <ScanReceipt
          items={items}
          billName={billName}
          perUnit={perUnit}
          makeRow={makeRow}
          onScanned={applyScan}
          scanText={scanText}
          setScanText={setScanText}
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

        <ItemRows
          items={items}
          setItems={setItems}
          perUnit={perUnit}
          makeRow={makeRow}
          reconciliation={reconciliation}
          locked={locked}
          onContinue={() => setLocked(false)}
        />
        {scanWarnings.length > 0 && (
          <div className="scan-warnings" role="alert">
            {scanWarnings.map((text) => (
              <span key={text} className="hint">{text}</span>
            ))}
            <button
              type="button"
              className="scan-warnings__dismiss"
              onClick={() => setScanWarnings([])}
            >
              Got it
            </button>
          </div>
        )}
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
                if (fees.length > 1) {
                  posthog.capture('fee_total_typed_over_breakdown', { collapsed_from: fees.length });
                }
                setFees(collapseFees(e.target.value));
              }}
            />
            <FeeCalculator fees={fees} onChange={setFees} />
          </div>
          {subNum > 0 && <span className="hint hint--muted">
            {taxPct.toFixed(2)}%
          </span>}
        </div>

        <div className="field">
          <label htmlFor="tip">Tip ($)</label>
          <div className="field__inline">
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
            <TipHelper subtotal={billSubtotal} onApply={setTipAmount} />
          </div>
          {subNum > 0 && <span className="hint hint--muted">
            {tipPct.toFixed(2)}%
          </span>}
        </div>

        <div className="field">
          <label htmlFor="bill_note">Note</label>
          <textarea
            id="bill_note"
            rows={2}
            autoComplete="off"
            placeholder="Anything the others should know"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {!locked && <>
          <div className="field switch">
            <label className="switch__row" htmlFor="split_even">
              <span className="field__label">Split Even</span>
              <input
                id="split_even"
                type="checkbox"
                role="switch"
                className="switch__input"
                checked={splitEven}
                onChange={(e) => toggleSplitEven(e.target.checked)}
              />
              <span className="switch__track" aria-hidden="true" />
            </label>
            <span className="field__label">Divide the line items evenly across the party</span>
          </div>

          {splitEven && (
            <div className="field__inline">
              <div className="field">
                <label htmlFor="party_size">Party Size</label>
                <input
                  id="party_size"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  placeholder="4"
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="my_party">My Party</label>
                <input
                  id="my_party"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  placeholder="2"
                  value={myParty}
                  onChange={(e) => setMyParty(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="result">
            <dl className="breakdown">
              <div className="row">
                <dt>Sub Total</dt>
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
              <button
                // style={{ display: 'none' }} // hide this. With the share feature we don't need to expose these to users
                type="button"
                className="action-btn"
                onClick={() => importRef.current?.click()}
              >
                Import
              </button>
              <button
                // style={{ display: 'none' }} // hide this. With the share feature we don't need to expose these to users
                type="button"
                className="action-btn"
                onClick={saveForm}>
                Save
              </button>
              <button type="button" className="scan-btn" onClick={shareLink}>
                {shared || 'Share'}
              </button>
              <input
                // style={{ display: 'none' }} // hide this. With the share feature we don't need to expose these to users
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
            </div>

            <footer className="footer">
              <a className="footer__link" href="https://postnesia.app/">
                © {new Date().getFullYear()} Ryan Wattrus
              </a>
            </footer>
          </div>
        </>}
      </section>

      <Calculator />
    </main>
  );
}
