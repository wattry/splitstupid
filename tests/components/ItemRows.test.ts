import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { PostHogContext } from '@posthog/react';
import ItemRows from '../../src/ItemRows.js';
import type { Item, ItemFields, Participant } from '../../src/types.js';
import { reconcile } from '../../src/lib/reconcile.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let seq = 0;
const makeRow = (fields: ItemFields = {}): Item =>
  ({ id: `r${++seq}`, units: '1', yours: '0', desc: '', price: '', ...fields });

const defaultParticipants: Participant[] = [{ id: 'me', name: 'Ryan' }, { id: 'sam', name: 'Sam Kim' }];

function Harness({ initial, perUnit, participants, onManageParticipants, meId }: {
  initial: Item[];
  perUnit: boolean;
  participants: Participant[];
  onManageParticipants: () => void;
  meId: string;
}) {
  const [items, setItems] = useState(initial);
  return React.createElement(ItemRows, {
    items,
    setItems,
    perUnit,
    makeRow,
    reconciliation: reconcile(items, perUnit, ''),
    locked: false,
    onContinue: () => {},
    participants,
    onManageParticipants,
    meId,
  });
}

function mount(initial: Item[], perUnit = false, participants: Participant[] = defaultParticipants, meId = 'me') {
  const capture = vi.fn();
  const onManage = vi.fn();
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(
      React.createElement(
        PostHogContext.Provider,
        { value: { client: { capture } as never } },
        React.createElement(Harness, { initial, perUnit, participants, onManageParticipants: onManage, meId })
      )
    );
  });
  return { host, capture, onManage };
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
const mineOf = (row: Element) => (row.querySelector('input[aria-label="How many were mine"]') as HTMLInputElement).value;
const trayButton = (row: Element, label: string) =>
  [...row.querySelectorAll('.items__tray button')].find((b) => b.textContent === label) as HTMLButtonElement | undefined;
const pickBox = (row: Element) => row.querySelector('input[aria-label="Select row"]') as HTMLInputElement;
const headPick = (host: Element) => host.querySelector('input[aria-label="Select all rows"]') as HTMLInputElement;
const bulkBar = (host: Element) => host.querySelector('.items__bulk');
const selectToggle = (host: Element) =>
  [...host.querySelectorAll('.items__select-toggle')][0] as HTMLButtonElement;
const check = (el: HTMLInputElement, value: boolean) => {
  if (el.checked !== value) click(el);
};

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

describe('ItemRows swipe tray (touch)', () => {
  it('swiping a row left snaps it open and shows Delete, Assign and Split', () => {
    const { host } = mount([makeRow({ units: '3', desc: 'Beer', price: '10.00' })]);
    const row = firstRow(host);
    expect(row.classList.contains('items__row--open')).toBe(false);
    swipeOpen(row);
    expect(row.classList.contains('items__row--open')).toBe(true);
    expect(trayButton(row, 'Delete')).toBeDefined();
    expect(trayButton(row, 'Assign')).toBeDefined();
    expect(trayButton(row, 'Split')).toBeDefined();
  });

  it('a single-unit row offers Delete and Assign only', () => {
    const { host } = mount([makeRow({ units: '1', desc: 'Beer', price: '10.00' })]);
    const row = firstRow(host);
    swipeOpen(row);
    expect(trayButton(row, 'Split')).toBeUndefined();
    expect(trayButton(row, 'Delete')).toBeDefined();
    expect(trayButton(row, 'Assign')).toBeDefined();
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

describe('ItemRows assign', () => {
  it('tray reads Delete, Assign, Split for a splittable row and Delete, Assign otherwise', () => {
    const { host } = mount([makeRow({ units: '3', desc: 'Beer', price: '10.00' }), makeRow({ units: '1', desc: 'Tea', price: '2' })]);
    const [a, b] = rows(host);
    swipeOpen(a!);
    expect([...a!.querySelectorAll('.items__tray button')].map((x) => x.textContent)).toEqual(['Delete', 'Assign', 'Split']);
    expect((a!.querySelector('.items__tray') as HTMLElement).style.width).toBe('216px');
    swipeOpen(b!);
    expect([...b!.querySelectorAll('.items__tray button')].map((x) => x.textContent)).toEqual(['Delete', 'Assign']);
    expect((b!.querySelector('.items__tray') as HTMLElement).style.width).toBe('144px');
  });

  it('desktop action column is remove, assign, split in that order', () => {
    const { host } = mount([makeRow({ units: '3', desc: 'Beer', price: '10.00' })]);
    const grid = firstRow(host).querySelector('.items__grid')!;
    const buttons = [...grid.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
    expect(buttons).toEqual(['Remove item', 'Assign to people', 'Split units into separate items']);
  });

  it('assign icon opens the Assign dialog; ticking Sam adds a pill; tapping the pill reopens', () => {
    const { host } = mount([makeRow({ units: '1', desc: 'Beer', price: '10.00' })]);
    click(firstRow(host).querySelector('button[aria-label="Assign to people"]')!);
    const dialog = host.querySelector('[role="dialog"][aria-label="Assign"]')!;
    click(dialog.querySelectorAll('.assign__row input[type="checkbox"]')[1]!);
    click(button(host, 'Done'));
    const pill = firstRow(host).querySelector('.pill')!;
    expect(pill.textContent).toBe('SK');
    expect(pill.getAttribute('aria-label')).toBe('Sam Kim');
    click(pill);
    expect(host.querySelector('[role="dialog"][aria-label="Assign"]')).toBeTruthy();
  });

  it('shows the By person section once a row is assigned and calls onManageParticipants', () => {
    const { host, onManage } = mount([makeRow({ units: '1', desc: 'Beer', price: '10.00' })]);
    expect(host.querySelector('.byperson')).toBeNull();
    click(firstRow(host).querySelector('button[aria-label="Assign to people"]')!);
    click(host.querySelectorAll('.assign__row input[type="checkbox"]')[0]!);
    expect(host.querySelector('.byperson')).toBeTruthy();
    expect(host.querySelector('.byperson__label')?.textContent).toBe('Ryan');
    click(button(host, 'Manage participants'));
    expect(onManage).toHaveBeenCalled();
  });

  it('tray Assign opens the dialog and closes the tray', () => {
    const { host } = mount([makeRow({ units: '1', desc: 'Beer', price: '10.00' })]);
    const row = firstRow(host);
    swipeOpen(row);
    click(trayButton(row, 'Assign')!);
    expect(host.querySelector('[role="dialog"][aria-label="Assign"]')).toBeTruthy();
    expect(row.classList.contains('items__row--open')).toBe(false);
  });
});

describe('ItemRows bulk assign', () => {
  const twoRows = () => [
    makeRow({ units: '1', desc: 'Beer', price: '10.00' }),
    makeRow({ units: '1', desc: 'Fries', price: '4.00' }),
  ];

  it('shows no action bar until a row is selected; ticking two rows shows "2 selected"; Clear hides it', () => {
    const { host } = mount(twoRows());
    expect(bulkBar(host)).toBeNull();
    const [a, b] = rows(host);
    check(pickBox(a!), true);
    check(pickBox(b!), true);
    expect(bulkBar(host)?.textContent).toContain('2 selected');
    click(bulkBar(host)!.querySelector('.items__bulk-clear')!);
    expect(bulkBar(host)).toBeNull();
  });

  it('header checkbox selects all, shows indeterminate with a partial selection, and unticks all', () => {
    const { host } = mount(twoRows());
    const [a, b] = rows(host);
    check(pickBox(a!), true);
    expect(headPick(host).indeterminate).toBe(true);
    expect(headPick(host).checked).toBe(false);
    check(headPick(host), true);
    expect(pickBox(a!).checked).toBe(true);
    expect(pickBox(b!).checked).toBe(true);
    expect(headPick(host).indeterminate).toBe(false);
    expect(headPick(host).checked).toBe(true);
    check(headPick(host), false);
    expect(pickBox(a!).checked).toBe(false);
    expect(pickBox(b!).checked).toBe(false);
  });

  it('"Assign to me" puts a Ryan pill on every selected row, none on unselected rows, and does not duplicate', () => {
    const { host } = mount(twoRows().concat(makeRow({ units: '1', desc: 'Soda', price: '2.00' })));
    const [a, b, c] = rows(host);
    check(pickBox(a!), true);
    check(pickBox(b!), true);
    const assignToMe = () => [...bulkBar(host)!.querySelectorAll('button')].find((btn) => btn.textContent === 'Assign to me')!;
    click(assignToMe());
    expect(a!.querySelector('.pill[aria-label="Ryan"]')).toBeTruthy();
    expect(b!.querySelector('.pill[aria-label="Ryan"]')).toBeTruthy();
    expect(c!.querySelector('.pill[aria-label="Ryan"]')).toBeNull();
    click(assignToMe());
    expect(a!.querySelectorAll('.pill[aria-label="Ryan"]')).toHaveLength(1);
  });

  it('"Assign…" opens a dialog titled "2 items"; toggles apply to both rows; selection persists after Done', () => {
    const { host } = mount(twoRows());
    const [a, b] = rows(host);
    check(pickBox(a!), true);
    check(pickBox(b!), true);
    // Pre-assign Sam Kim to just the first row so her checkbox starts indeterminate.
    click(a!.querySelector('button[aria-label="Assign to people"]')!);
    click(host.querySelectorAll('.assign__row input[type="checkbox"]')[1]!);
    click(button(host, 'Done'));

    const assignEllipsis = () => [...bulkBar(host)!.querySelectorAll('button')].find((btn) => btn.textContent === 'Assign…')!;
    click(assignEllipsis());
    const dialog = host.querySelector('[role="dialog"][aria-label="Assign"]')!;
    expect(dialog.textContent).toContain('2 items');
    const samBox = host.querySelectorAll<HTMLInputElement>('.assign__row input[type="checkbox"]')[1]!;
    expect(samBox.indeterminate).toBe(true);

    click(samBox);
    expect(a!.querySelector('.pill[aria-label="Sam Kim"]')).toBeTruthy();
    expect(b!.querySelector('.pill[aria-label="Sam Kim"]')).toBeTruthy();
    expect(samBox.checked).toBe(true);
    expect(samBox.indeterminate).toBe(false);

    click(host.querySelectorAll<HTMLInputElement>('.assign__row input[type="checkbox"]')[1]!);
    expect(a!.querySelector('.pill[aria-label="Sam Kim"]')).toBeNull();
    expect(b!.querySelector('.pill[aria-label="Sam Kim"]')).toBeNull();

    click(button(host, 'Done'));
    expect(bulkBar(host)?.textContent).toContain('2 selected');
  });

  it('removing every selected row while the Assign dialog is open closes the dialog', () => {
    const { host } = mount(twoRows());
    const [a, b] = rows(host);
    check(pickBox(a!), true);
    check(pickBox(b!), true);
    const assignEllipsis = () => [...bulkBar(host)!.querySelectorAll('button')].find((btn) => btn.textContent === 'Assign…')!;
    click(assignEllipsis());
    expect(host.querySelector('[role="dialog"][aria-label="Assign"]')).toBeTruthy();

    // The dialog overlays the rows, but the desktop Remove buttons are still in the DOM.
    click(a!.querySelector('button[aria-label="Remove item"]')!);
    click(b!.querySelector('button[aria-label="Remove item"]')!);

    expect(host.querySelector('[role="dialog"][aria-label="Assign"]')).toBeNull();
  });

  it('Select toggle flips to Done, adds items--selecting, and Done clears the selection and the class', () => {
    const { host } = mount(twoRows());
    const itemsEl = host.querySelector('.items')!;
    expect(itemsEl.classList.contains('items--selecting')).toBe(false);
    click(selectToggle(host));
    expect(selectToggle(host).textContent).toBe('Done');
    expect(itemsEl.classList.contains('items--selecting')).toBe(true);
    check(pickBox(firstRow(host)), true);
    expect(bulkBar(host)?.textContent).toContain('1 selected');
    click(selectToggle(host));
    expect(selectToggle(host).textContent).toBe('Select');
    expect(itemsEl.classList.contains('items--selecting')).toBe(false);
    expect(bulkBar(host)).toBeNull();
  });

  it('removing a selected row via the desktop Remove item button drops it from the count', () => {
    const { host } = mount(twoRows());
    const [a, b] = rows(host);
    check(pickBox(a!), true);
    check(pickBox(b!), true);
    expect(bulkBar(host)?.textContent).toContain('2 selected');
    click(a!.querySelector('button[aria-label="Remove item"]')!);
    expect(bulkBar(host)?.textContent).toContain('1 selected');
  });

  it('footer Clear empties the selection and hides the bar', () => {
    const { host } = mount(twoRows());
    const [a, b] = rows(host);
    check(pickBox(a!), true);
    check(pickBox(b!), true);
    expect(bulkBar(host)?.textContent).toContain('2 selected');
    click([...host.querySelectorAll('.items__clear')][0]!);
    expect(bulkBar(host)).toBeNull();
  });

  it('splitting a selected row yields rows that are not selected', () => {
    const { host } = mount([makeRow({ units: '3', desc: 'Beer', price: '10.00' })]);
    const [a] = rows(host);
    check(pickBox(a!), true);
    expect(bulkBar(host)?.textContent).toContain('1 selected');
    click(a!.querySelector('.items__split')!);
    // Split out every unit so none of the resulting rows keeps the original id.
    type(host.querySelector('.split__count') as HTMLInputElement, '3');
    click(button(host, 'Split'));
    expect(bulkBar(host)).toBeNull();
  });

  it('tapping Select while a swipe tray is open closes the tray', () => {
    const { host } = mount(twoRows());
    const row = firstRow(host);
    swipeOpen(row);
    expect(row.classList.contains('items__row--open')).toBe(true);
    click(selectToggle(host));
    expect(firstRow(host).classList.contains('items__row--open')).toBe(false);
  });
});

describe('ItemRows Mine column', () => {
  it('header reads Mine', () => {
    const { host } = mount([makeRow({ desc: 'Beer' })]);
    expect(host.querySelector('.items__head')?.textContent).toContain('Mine');
  });

  it('new rows show Mine 0', () => {
    const { host } = mount([makeRow({ units: '3', desc: 'Beer', price: '10.00' })]);
    expect(mineOf(firstRow(host))).toBe('0');
  });

  it('assigning Me from the row dialog sets Mine to 1; unticking sets it back to 0', () => {
    const { host } = mount([makeRow({ units: '1', desc: 'Beer', price: '10.00' })]);
    click(firstRow(host).querySelector('button[aria-label="Assign to people"]')!);
    const meBox = host.querySelectorAll<HTMLInputElement>('.assign__row input[type="checkbox"]')[0]!;
    click(meBox);
    expect(mineOf(firstRow(host))).toBe('1');
    click(meBox);
    expect(mineOf(firstRow(host))).toBe('0');
  });

  it('"Assign to me" on two selected rows sets Mine to 1 on both; a second press leaves it at 1', () => {
    const { host } = mount([
      makeRow({ units: '1', desc: 'Beer', price: '10.00' }),
      makeRow({ units: '1', desc: 'Fries', price: '4.00' }),
    ]);
    const [a, b] = rows(host);
    check(pickBox(a!), true);
    check(pickBox(b!), true);
    const assignToMe = () => [...bulkBar(host)!.querySelectorAll('button')].find((btn) => btn.textContent === 'Assign to me')!;
    click(assignToMe());
    expect(mineOf(a!)).toBe('1');
    expect(mineOf(b!)).toBe('1');
    click(assignToMe());
    expect(mineOf(a!)).toBe('1');
    expect(mineOf(b!)).toBe('1');
  });
});
