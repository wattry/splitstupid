import React, { useState } from 'react';
import type { Dispatch, SetStateAction, ReactElement, PointerEvent } from 'react';
import { usePostHog } from '@posthog/react';
import type { Item, MakeRow } from './types.js';
import { useSwipeActions } from './hooks/useSwipeActions.js';
import ReconcileRow from './components/ReconcileRow.js';
import { SplitModal } from './components/SplitModal.js';
import { SplitIcon } from './components/Icons.js';
import type { Reconciliation } from './lib/reconcile.js';
import { ACTION_WIDTH } from './lib/swipe.js';
import { canSplit, maxSplit, splitItem } from './lib/splitItem.js';

export type { Item } from './types.js';

interface ItemRowsProps {
  items: Item[];
  setItems: Dispatch<SetStateAction<Item[]>>;
  perUnit: boolean;
  makeRow: MakeRow;
  reconciliation: Reconciliation;
  /** After a scan, hide the Yours column until the rows match the Sub Total. */
  locked: boolean;
  onContinue: () => void;
};

const money = (n: number) => `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`

/**
 * Amount of a row attributable to the user.
 *  - per-unit mode:  yours × price
 *  - total mode:     price × (yours / units)
 *
 * @param row
 * @param perUnit
 * @returns
 */
export function rowOwed(row: Item, perUnit: boolean): number {
  const yours = parseFloat(row.yours) || 0;
  const price = parseFloat(row.price) || 0;

  if (perUnit) { return yours * price }

  const units = parseFloat(row.units) || 0;

  return units > 0 ? price * (yours / units) : 0;
}

/**
 * Editable list of receipt line items. Each row is Units / Yours / Description /
 * Price, plus a remove button and the amount owed by the user. "Units" is the
 * count on the receipt; "Yours" is how many you actually had. Whether Price is
 * per-unit or a total for all units is governed by the parent's `perUnit` flag.
 *
 * @param props
 * @typedef Row
 */
export default function ItemRows(
  props: ItemRowsProps
): ReactElement {
  const {
    items,
    setItems,
    perUnit,
    makeRow,
    reconciliation,
    locked,
    onContinue
  } = props;
  const posthog = usePostHog();
  // Row being split via the Split dialog, if any.
  const [splitting, setSplitting] = useState<Item | null>(null);
  // Row whose swipe tray is open (touch); at most one at a time.
  const [openId, setOpenId] = useState<string | null>(null);
  const update = (id: string, field: string, value: unknown) =>
    setItems(items.map((it) => {
      if (it.id !== id) return it
      const next = { ...it, [field]: value }
      // "Yours" tracks "Total" (units) until the user edits Yours on its own.
      if (field === 'units' && it.yours === it.units) next.yours = value as string
      return next
    }))

  // Functional update: the swipe hook calls this after a short exit animation,
  // so it must not rely on the `items` captured when the gesture started.
  const remove = (id: string) => setItems((prev) => {
    const next = prev.filter((it) => it.id !== id)
    return next.length ? next : [makeRow()]
  })

  const add = () => setItems([...items, makeRow()])

  const clear = () => setItems([makeRow()])

  // Replace the held row with its split-out singles, in place.
  const split = (count: number) => {
    if (!splitting) return
    const target = splitting
    setSplitting(null)
    setItems((prev) => prev.flatMap((it) => (it.id === target.id ? splitItem(it, count, perUnit, makeRow) : it)))
    posthog.capture('item_split', { count, units: maxSplit(target), per_unit: perUnit })
  }

  // Rows with real content; the blank starter row doesn't count.
  const filled = items.filter((it) => it.desc.trim() || (parseFloat(it.price) || 0) > 0).length

  return (
    <div className="field">
      <span className="field__label">
        Total line items
        {filled > 0 && <span className="field__count"> · {filled}</span>}
      </span>

      <div className={`items${locked ? ' items--locked' : ''}`}>
        <div className="items__head">
          <span>Total</span>
          {!locked && <span>Yours</span>}
          <span>Description</span>
          <span>{perUnit ? 'Each' : 'Total'}</span>
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </div>

        {items.map((it) => (
          <ItemRow
            key={it.id}
            item={it}
            perUnit={perUnit}
            locked={locked}
            update={update}
            remove={remove}
            onSplit={setSplitting}
            open={openId === it.id}
            setOpen={(open) => setOpenId(open ? it.id : null)}
          />
        ))}
      </div>

      {splitting && (
        <SplitModal
          max={maxSplit(splitting)}
          desc={splitting.desc}
          onSplit={split}
          onClose={() => setSplitting(null)}
        />
      )}

      {filled > 0 && (
        <ReconcileRow reconciliation={reconciliation} locked={locked} onContinue={onContinue} />
      )}

      <div className="items__actions">
        <button type="button" className="items__add" onClick={add}>
          + Add item
        </button>
        <button type="button" className="items__clear" onClick={clear}>
          Clear
        </button>
      </div>

      <span className="items__count field__label">
        {items.length} {items.length === 1 ? 'item' : 'items'}
      </span>
    </div>
  )
}

interface ItemRowProps {
  item: Item;
  perUnit: boolean;
  locked: boolean;
  update: (id: string, field: string, value: unknown) => void;
  remove: (id: string) => void;
  /** Open the Split dialog for this row. */
  onSplit: (item: Item) => void;
  /** Whether this row's swipe tray is showing. */
  open: boolean;
  setOpen: (open: boolean) => void;
}

/**
 * One editable line item. On touch devices the row swipes left to reveal
 * Split and Delete buttons; on pointer devices the split icon and × button
 * at the end of the row do the job.
 */
function ItemRow({ item: it, perUnit, locked, update, remove, onSplit, open, setOpen }: ItemRowProps): ReactElement {
  const splittable = canSplit(it);
  const tray = (splittable ? 2 : 1) * ACTION_WIDTH;
  const swipe = useSwipeActions(tray, open, setOpen);

  const handlers = {
    ...swipe.handlers,
    // Touching any other row closes the open tray.
    onPointerDownCapture: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'touch' && !open) setOpen(false);
    },
  };

  const split = () => {
    setOpen(false);
    onSplit(it);
  };

  const del = () => swipe.leave(() => remove(it.id));

  return (
    <div
      className={`items__row${open ? ' items__row--open' : ''}${swipe.dragging ? ' items__row--dragging' : ''}${swipe.leaving ? ' items__row--leaving' : ''}`}
      id={it.id}
      {...handlers}
    >
      <div className="items__tray" style={{ width: tray }}>
        {splittable && (
          <button type="button" className="items__tray-btn items__tray-btn--split" onClick={split}>
            Split
          </button>
        )}
        <button type="button" className="items__tray-btn items__tray-btn--delete" onClick={del}>
          Delete
        </button>
      </div>
      <div className="items__grid" style={swipe.style}>
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
        {!locked && <input
          className="items__num"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={it.yours}
          onChange={(e) => update(it.id, 'yours', e.target.value)}
          aria-label="How many you had"
        />}
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
          className="items__split"
          onClick={split}
          disabled={!splittable}
          aria-label="Split units into separate items"
          title={splittable ? 'Split' : 'Needs 2 or more units'}
        >
          <SplitIcon />
        </button>
        <button
          type="button"
          className="items__remove"
          onClick={() => remove(it.id)}
          aria-label="Remove item"
        >
          &times;
        </button>
      </div>
      {!locked && <span className="items__owe">you owe {money(rowOwed(it, perUnit))}</span>}
    </div>
  );
}
