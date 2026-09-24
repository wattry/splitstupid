import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import App from '../../src/App.js';
import { encodeState } from '../../src/lib/shareLink.js';
import type { SavedState } from '../../src/lib/shareLink.js';
import { FRIENDS_STORAGE_KEY } from '../../src/lib/friends.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const click = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const button = (host: Element, label: string) =>
  [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
const byLabel = (host: Element, label: string) =>
  host.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement;
const type = (input: HTMLInputElement, value: string) => act(() => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
const submit = (input: HTMLInputElement) => act(() => {
  input.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
});
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });
const chipNames = (host: Element) =>
  [...host.querySelectorAll('.chip__name')].map((el) => el.textContent);

let host: HTMLDivElement;

function mount() {
  host = document.createElement('div');
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(React.createElement(App));
  });
  return host;
}

const minimalState = (participants: SavedState['participants']): SavedState => ({
  billName: '',
  note: '',
  scanText: '',
  billSubtotal: '10',
  fees: [],
  tipAmount: '',
  perUnit: false,
  splitEven: false,
  partySize: '4',
  myParty: '1',
  participants,
  items: [{ id: 'a', units: '1', yours: '1', desc: 'Soup', price: '10' }],
});

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  window.location.hash = '';
});

describe('App friends and participants integration', () => {
  it('manages friends via the overlay: add two, close, chip names and localStorage persist', async () => {
    const h = mount();
    await flush();

    click(button(h, 'Manage Friends'));
    const nameInput = byLabel(h, 'New friend name');

    type(nameInput, 'Sam');
    submit(nameInput);

    type(nameInput, 'Alex');
    submit(nameInput);

    click(button(h, 'Close'));

    expect(button(h, 'Manage Friends (2)')).toBeTruthy();
    expect(chipNames(h)).toEqual(['Sam', 'Alex']);

    const stored = JSON.parse(localStorage.getItem(FRIENDS_STORAGE_KEY)!);
    expect(stored.friends.map((f: { name: string }) => f.name)).toEqual(['Sam', 'Alex']);
  });

  it('renames Sam through the edit view and updates the chip', async () => {
    const h = mount();
    await flush();

    click(button(h, 'Manage Friends'));
    const nameInput = byLabel(h, 'New friend name');
    type(nameInput, 'Sam');
    submit(nameInput);

    click(h.querySelector('[aria-label="Edit Sam"]')!);
    const editInput = byLabel(h, 'Friend name');
    type(editInput, 'Sammy');
    submit(editInput);

    click(button(h, 'Close'));

    expect(chipNames(h)).toEqual(['Sammy']);
  });

  it('loads participants from a shared link without touching the friend list, and Add persists the new friend', async () => {
    const encoded = await encodeState(
      minimalState([
        { id: 'id-jo', name: 'Jo' },
        { id: 'id-known', name: 'Known' },
      ])
    );
    window.location.hash = `#s=${encoded}`;
    const h = mount();
    await flush();

    expect(chipNames(h)).toEqual(['Jo', 'Known']);
    expect(localStorage.getItem(FRIENDS_STORAGE_KEY)).toBe(JSON.stringify({ v: 1, friends: [] }));

    const addBtn = h.querySelector('[aria-label="Add Jo to friends"]');
    expect(addBtn).toBeTruthy();
    click(addBtn!);

    expect(h.querySelector('[aria-label="Add Jo to friends"]')).toBeFalsy();
    const stored = JSON.parse(localStorage.getItem(FRIENDS_STORAGE_KEY)!);
    expect(stored.friends).toEqual([{ id: 'id-jo', name: 'Jo' }]);
  });

  it('leaves participants unchanged when editing the sub total and toggling per-unit', async () => {
    const h = mount();
    await flush();

    click(button(h, 'Manage Friends'));
    const nameInput = byLabel(h, 'New friend name');
    type(nameInput, 'Sam');
    submit(nameInput);
    click(button(h, 'Close'));

    expect(chipNames(h)).toEqual(['Sam']);

    const subTotal = h.querySelector('#sub_total') as HTMLInputElement;
    type(subTotal, '25');
    click(h.querySelector('.toggle__btn')!);

    expect(chipNames(h)).toEqual(['Sam']);
  });
});
