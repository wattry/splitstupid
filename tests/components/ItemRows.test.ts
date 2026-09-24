import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { PostHogContext } from '@posthog/react';
import ItemRows from '../../src/ItemRows.js';
import type { Item, ItemFields } from '../../src/types.js';
import { reconcile } from '../../src/lib/reconcile.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let seq = 0;
const makeRow = (fields: ItemFields = {}): Item => {
  const row: Item = { id: `r${++seq}`, units: '1', yours: '1', desc: '', price: '', ...fields };
  if (fields.yours === undefined) row.yours = row.units;
  return row;
};

function Harness({ initial, perUnit }: { initial: Item[]; perUnit: boolean }) {
  const [items, setItems] = useState(initial);
  return React.createElement(ItemRows, {
    items,
    setItems,
    perUnit,
    makeRow,
    reconciliation: reconcile(items, perUnit, ''),
    locked: false,
    onContinue: () => {},
  });
}

function mount(initial: Item[], perUnit = false) {
  const capture = vi.fn();
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(
      React.createElement(
        PostHogContext.Provider,
        { value: { client: { capture } as never } },
        React.createElement(Harness, { initial, perUnit })
      )
    );
  });
  return { host, capture };
}

const pointer = (el: Element, type: string, x = 10, y = 10, pointerType = 'touch') => act(() => {
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerType, pointerId: 1 }));
});
const click = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
/** A button inside the Split dialog (the swipe tray has its own Split button). */
const button = (host: Element, label: string) =>
  [...host.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent === label)!;
const type = (input: HTMLInputElement, value: string) => act(() => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
/** Touch swipe the row far enough left to snap the action tray open. */
const swipeOpen = (row: Element) => {
  pointer(row, 'pointerdown', 300, 10);
  pointer(row, 'pointermove', 150, 12);
  pointer(row, 'pointerup', 150, 12);
};
const rows = (host: Element) => [...host.querySelectorAll('.items__row')];
const firstRow = (host: Element) => rows(host)[0]!;
const unitsOf = (row: Element) => (row.querySelector('input[aria-label="Units on receipt"]') as HTMLInputElement).value;
const priceOf = (row: Element) => (row.querySelector('.items__price') as HTMLInputElement).value;
const trayButton = (row: Element, label: string) =>
  [...row.querySelectorAll('.items__tray button')].find((b) => b.textContent === label) as HTMLButtonElement | undefined;

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

describe('ItemRows swipe tray (touch)', () => {
  it('swiping a row left snaps it open and shows Split and Delete', () => {
    const { host } = mount([makeRow({ units: '3', desc: 'Beer', price: '10.00' })]);
    const row = firstRow(host);
    expect(row.classList.contains('items__row--open')).toBe(false);
    swipeOpen(row);
    expect(row.classList.contains('items__row--open')).toBe(true);
    expect(trayButton(row, 'Split')).toBeDefined();
    expect(trayButton(row, 'Delete')).toBeDefined();
  });

  it('a single-unit row offers Delete only', () => {
    const { host } = mount([makeRow({ units: '1', desc: 'Beer', price: '10.00' })]);
    const row = firstRow(host);
    swipeOpen(row);
    expect(trayButton(row, 'Split')).toBeUndefined();
    expect(trayButton(row, 'Delete')).toBeDefined();
  });

  it('a short swipe snaps back closed', () => {
    const { host } = mount([makeRow({ units: '3', desc: 'Beer', price: '10.00' })]);
    const row = firstRow(host);
    pointer(row, 'pointerdown', 300, 10);
    pointer(row, 'pointermove', 280, 12);
    pointer(row, 'pointerup', 280, 12);
    expect(row.classList.contains('items__row--open')).toBe(false);
  });

  it('mouse drags never open the tray', () => {
    const { host } = mount([makeRow({ units: '3', desc: 'Beer', price: '10.00' })]);
    const row = firstRow(host);
    pointer(row, 'pointerdown', 300, 10, 'mouse');
    pointer(row, 'pointermove', 150, 12, 'mouse');
    pointer(row, 'pointerup', 150, 12, 'mouse');
    expect(row.classList.contains('items__row--open')).toBe(false);
  });

  it('touching another row closes the open one', () => {
    const { host } = mount([
      makeRow({ units: '3', desc: 'Beer', price: '10.00' }),
      makeRow({ units: '1', desc: 'Fries', price: '4.00' }),
    ]);
    const [a, b] = rows(host) as [Element, Element];
    swipeOpen(a);
    pointer(b, 'pointerdown', 300, 10);
    pointer(b, 'pointerup', 300, 10);
    expect(a.classList.contains('items__row--open')).toBe(false);
  });

  it('tray Split opens the Split dialog and closes the tray', () => {
    const { host } = mount([makeRow({ units: '3', desc: 'Beer', price: '10.00' })]);
    const row = firstRow(host);
    swipeOpen(row);
    click(trayButton(row, 'Split')!);
    expect(host.querySelector('[role="dialog"][aria-label="Split"]')).not.toBeNull();
    expect(row.classList.contains('items__row--open')).toBe(false);
  });

  it('tray Delete removes the row after the exit animation', () => {
    const { host } = mount([
      makeRow({ units: '3', desc: 'Beer', price: '10.00' }),
      makeRow({ units: '1', desc: 'Fries', price: '4.00' }),
    ]);
    const row = firstRow(host);
    swipeOpen(row);
    click(trayButton(row, 'Delete')!);
    act(() => { vi.advanceTimersByTime(200); });
    expect(rows(host)).toHaveLength(1);
    expect(unitsOf(firstRow(host))).toBe('1');
  });
});

describe('ItemRows split button (desktop)', () => {
  it('rows with several units get an enabled split button; single-unit rows a disabled one', () => {
    const { host } = mount([
      makeRow({ units: '3', desc: 'Beer', price: '10.00' }),
      makeRow({ units: '1', desc: 'Fries', price: '4.00' }),
    ]);
    const [a, b] = rows(host) as [Element, Element];
    expect((a.querySelector('.items__split') as HTMLButtonElement).disabled).toBe(false);
    expect((b.querySelector('.items__split') as HTMLButtonElement).disabled).toBe(true);
  });

  it('clicking the split button opens the Split dialog', () => {
    const { host } = mount([makeRow({ units: '3', desc: 'Beer', price: '10.00' })]);
    click(firstRow(host).querySelector('.items__split')!);
    expect(host.querySelector('[role="dialog"][aria-label="Split"]')).not.toBeNull();
  });
});

describe('ItemRows split', () => {
  it('splitting replaces the row in place, keeps the total, and closes the dialog', () => {
    const { host, capture } = mount([
      makeRow({ units: '3', desc: 'Beer', price: '10.00' }),
      makeRow({ units: '1', desc: 'Fries', price: '4.00' }),
    ]);
    click(firstRow(host).querySelector('.items__split')!);
    type(host.querySelector('.split__count') as HTMLInputElement, '2');
    click(button(host, 'Split'));

    expect(host.querySelector('[role="dialog"]')).toBeNull();
    const after = rows(host);
    expect(after).toHaveLength(4);
    expect(after.map(unitsOf)).toEqual(['1', '1', '1', '1']);
    expect(after.map(priceOf)).toEqual(['3.34', '3.33', '3.33', '4.00']);
    expect(capture).toHaveBeenCalledWith('item_split', { count: 2, units: 3, per_unit: false });
  });

  it('cancel leaves the rows alone', () => {
    const { host } = mount([makeRow({ units: '3', desc: 'Beer', price: '10.00' })]);
    click(firstRow(host).querySelector('.items__split')!);
    click(button(host, 'Cancel'));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(rows(host)).toHaveLength(1);
  });
});
