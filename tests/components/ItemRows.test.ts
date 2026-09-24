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

const pointer = (el: Element, type: string, x = 10, y = 10) => act(() => {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
});
const click = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const button = (host: Element, label: string) =>
  [...host.querySelectorAll('button')].find((b) => b.textContent === label)!;
const type = (input: HTMLInputElement, value: string) => act(() => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
const hold = (row: Element) => {
  pointer(row, 'pointerdown');
  act(() => { vi.advanceTimersByTime(500); });
};
const rows = (host: Element) => [...host.querySelectorAll('.items__row')];
const firstRow = (host: Element) => rows(host)[0]!;
const unitsOf = (row: Element) => (row.querySelector('input[aria-label="Units on receipt"]') as HTMLInputElement).value;
const priceOf = (row: Element) => (row.querySelector('.items__price') as HTMLInputElement).value;

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

describe('ItemRows split', () => {
  it('holding a multi-unit row opens the Split dialog', () => {
    const { host } = mount([makeRow({ units: '3', desc: 'Beer', price: '10.00' })]);
    hold(firstRow(host));
    expect(host.querySelector('[role="dialog"][aria-label="Split"]')).not.toBeNull();
  });

  it('holding a single-unit row does nothing', () => {
    const { host } = mount([makeRow({ units: '1', desc: 'Beer', price: '10.00' })]);
    hold(firstRow(host));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  it('releasing or dragging before the hold elapses does not open the dialog', () => {
    const { host } = mount([makeRow({ units: '3', desc: 'Beer', price: '10.00' })]);
    const row = firstRow(host);
    pointer(row, 'pointerdown');
    act(() => { vi.advanceTimersByTime(200); });
    pointer(row, 'pointerup');
    act(() => { vi.advanceTimersByTime(500); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();

    pointer(row, 'pointerdown');
    pointer(row, 'pointermove', 40, 10);
    act(() => { vi.advanceTimersByTime(500); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  it('splitting replaces the row in place, keeps the total, and closes the dialog', () => {
    const { host, capture } = mount([
      makeRow({ units: '3', desc: 'Beer', price: '10.00' }),
      makeRow({ units: '1', desc: 'Fries', price: '4.00' }),
    ]);
    hold(firstRow(host));
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
    hold(firstRow(host));
    click(button(host, 'Cancel'));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(rows(host)).toHaveLength(1);
  });
});
