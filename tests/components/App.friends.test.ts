import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import App from '../../src/App.js';
import { encodeState, decodeState } from '../../src/lib/shareLink.js';
import type { SavedState } from '../../src/lib/shareLink.js';
import { FRIENDS_STORAGE_KEY } from '../../src/lib/friends.js';
import { ME_STORAGE_KEY } from '../../src/lib/me.js';

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

const seedMe = (name = 'Ryan') =>
  localStorage.setItem(ME_STORAGE_KEY, JSON.stringify({ v: 1, id: 'id-me', name }));

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
    seedMe();
    const h = mount();
    await flush();

    click(button(h, 'Manage Participants (1)'));
    const nameInput = byLabel(h, 'New friend name');

    type(nameInput, 'Sam');
    submit(nameInput);

    type(nameInput, 'Alex');
    submit(nameInput);

    click(button(h, 'Close'));

    expect(button(h, 'Manage Participants (3)')).toBeTruthy();
    expect(chipNames(h)).toEqual(['Ryan', 'Sam', 'Alex']);

    const stored = JSON.parse(localStorage.getItem(FRIENDS_STORAGE_KEY)!);
    expect(stored.friends.map((f: { name: string }) => f.name)).toEqual(['Sam', 'Alex']);
  });

  it('renames Sam through the edit view and updates the chip', async () => {
    seedMe();
    const h = mount();
    await flush();

    click(button(h, 'Manage Participants (1)'));
    const nameInput = byLabel(h, 'New friend name');
    type(nameInput, 'Sam');
    submit(nameInput);

    click(h.querySelector('[aria-label="Edit Sam"]')!);
    const editInput = byLabel(h, 'Friend name');
    type(editInput, 'Sammy');
    submit(editInput);

    click(button(h, 'Close'));

    expect(chipNames(h)).toEqual(['Ryan', 'Sammy']);
  });

  it('loads participants from a shared link without touching the friend list, and Add persists the new friend', async () => {
    seedMe();
    const encoded = await encodeState(
      minimalState([
        { id: 'id-jo', name: 'Jo' },
        { id: 'id-known', name: 'Known' },
      ])
    );
    window.location.hash = `#s=${encoded}`;
    const h = mount();
    await flush();

    expect(chipNames(h)).toEqual(['Ryan', 'Jo', 'Known']);
    expect(localStorage.getItem(FRIENDS_STORAGE_KEY)).toBe(JSON.stringify({ v: 1, friends: [] }));

    click(h.querySelector('[aria-label="Options for Jo"]')!);
    const addBtn = h.querySelector('[aria-label="Add Jo to friends"]');
    expect(addBtn).toBeTruthy();
    click(addBtn!);

    expect(h.querySelector('[aria-label="Add Jo to friends"]')).toBeFalsy();
    const stored = JSON.parse(localStorage.getItem(FRIENDS_STORAGE_KEY)!);
    expect(stored.friends).toEqual([{ id: 'id-jo', name: 'Jo' }]);
  });

  it('leaves participants unchanged when editing the sub total and toggling per-unit', async () => {
    seedMe();
    const h = mount();
    await flush();

    click(button(h, 'Manage Participants (1)'));
    const nameInput = byLabel(h, 'New friend name');
    type(nameInput, 'Sam');
    submit(nameInput);
    click(button(h, 'Close'));

    expect(chipNames(h)).toEqual(['Ryan', 'Sam']);

    const subTotal = h.querySelector('#sub_total') as HTMLInputElement;
    type(subTotal, '25');
    click(h.querySelector('.toggle__btn')!);

    expect(chipNames(h)).toEqual(['Ryan', 'Sam']);
  });

  it('starts a new bill with an unnamed Me that has no remove button', async () => {
    const h = mount();
    await flush();
    expect(chipNames(h)).toEqual(['Me']);
    expect(button(h, 'Manage Participants (1)')).toBeTruthy();
    expect(h.querySelector('[aria-label="Remove Me from bill"]')).toBeNull();
  });

  it('rejects a friend named "me" while Me is blank', async () => {
    const h = mount();
    await flush();
    click(button(h, 'Manage Participants (1)'));
    const nameInput = byLabel(h, 'New friend name');
    type(nameInput, 'me');
    submit(nameInput);
    expect(h.textContent).toContain('You already have a friend named Me.');
  });

  it('does not add Me twice when the link already contains this device', async () => {
    seedMe();
    window.location.hash = `#s=${await encodeState(minimalState([{ id: 'id-jo', name: 'Jo' }, { id: 'id-me', name: 'Ryan' }]))}`;
    const h = mount();
    await flush();
    expect(chipNames(h)).toEqual(['Jo', 'Ryan']);
  });

  it('rejects a friend named like Me and renaming Me to a friend', async () => {
    seedMe('Ryan');
    const h = mount();
    await flush();
    click(button(h, 'Manage Participants (1)'));
    const nameInput = byLabel(h, 'New friend name');
    type(nameInput, 'ryan');
    submit(nameInput);
    expect(h.textContent).toContain('You already have a friend named Ryan.');
    type(nameInput, 'Sam');
    submit(nameInput);
    click(h.querySelector('[aria-label="Edit Ryan"]')!);
    const meInput = byLabel(h, 'Your name');
    type(meInput, 'sam');
    submit(meInput);
    expect(h.textContent).toContain('You already have a friend named Sam.');
  });

  it('renaming Me updates the Me chip', async () => {
    seedMe('');
    const h = mount();
    await flush();
    click(button(h, 'Manage Participants (1)'));
    click(h.querySelector('[aria-label="Edit Me"]')!);
    const meInput = byLabel(h, 'Your name');
    type(meInput, 'Ryan');
    submit(meInput);
    click(button(h, 'Close'));
    expect(chipNames(h)).toEqual(['Ryan']);
    expect(JSON.parse(localStorage.getItem(ME_STORAGE_KEY)!).name).toBe('Ryan');
  });

  it('gates Share behind the name prompt when Me is unnamed, then shares', async () => {
    const shareSpy = vi.fn(async (_data: { text: string }) => undefined);
    Object.defineProperty(navigator, 'share', { value: shareSpy, configurable: true });
    const h = mount();
    await flush();
    click(button(h, 'Share'));
    expect(h.querySelector('[aria-label="What\'s your name?"]')).toBeTruthy();
    expect(shareSpy).not.toHaveBeenCalled();
    const input = byLabel(h, 'Your name');
    type(input, 'Ryan');
    submit(input);
    await flush();
    expect(h.querySelector('[aria-label="What\'s your name?"]')).toBeNull();
    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(chipNames(h)).toEqual(['Ryan']);

    const sharedText = shareSpy.mock.calls[0]![0].text;
    const encoded = sharedText.split('#s=')[1]!;
    const decoded = await decodeState(encoded);
    expect(decoded).toBeTruthy();
    expect(decoded!.participants).toEqual([{ id: decoded!.participants[0]!.id, name: 'Ryan' }]);
  });

  it('cleans participants from a JSON import the same way share links do', async () => {
    seedMe('Ryan');
    const h = mount();
    await flush();

    const json = JSON.stringify({
      version: 1,
      items: [{ id: 'a', units: '1', yours: '1', desc: 'Soup', price: '10' }],
      participants: [
        { id: 'id-jo', name: 'Jo' },
        { id: 'id-jo', name: 'Dup' },
        { id: 'x', name: '  ' },
      ],
    });
    const file = new File([json], 'bill.json', { type: 'application/json' });
    // ScanReceipt also renders a hidden file input; the JSON importer's is
    // distinguished by its `accept`.
    const input = h.querySelector('input[accept="application/json,.json"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(chipNames(h)).toEqual(['Ryan', 'Jo']);
  });

  it('assigns a row, and unchecking the participant removes the pill and the group', async () => {
    seedMe('Ryan');
    const h = mount();
    await flush();
    click(button(h, 'Manage Participants (1)'));
    const nameInput = byLabel(h, 'New friend name');
    type(nameInput, 'Sam Kim');
    submit(nameInput);
    click(button(h, 'Close'));
    click(h.querySelector('button[aria-label="Assign to people"]')!);
    const boxes = h.querySelectorAll('.assign__row input[type="checkbox"]');
    click(boxes[1]!);
    click(button(h, 'Done'));
    expect(h.querySelector('.pill')?.textContent).toBe('SK');
    expect(h.querySelector('.byperson__name')?.textContent).toBe('Sam Kim');
    click(button(h, 'Manage Participants (2)'));
    click(h.querySelector('.friends__row:not(.friends__row--me) input[type="checkbox"]')!);
    click(button(h, 'Close'));
    expect(h.querySelector('.pill')).toBeNull();
    expect(h.querySelector('.byperson')).toBeNull();

    // Re-adding Sam Kim reuses the same friend id; without stripping the
    // assignee on removal, the pill would silently come back here.
    click(button(h, 'Manage Participants (1)'));
    click(h.querySelector('.friends__row:not(.friends__row--me) input[type="checkbox"]')!);
    click(button(h, 'Close'));
    expect(h.querySelector('.pill')).toBeNull();
    expect(h.querySelector('.byperson')).toBeNull();
  });

  it('removing a participant via the chip really drops their assignment', async () => {
    seedMe('Ryan');
    const h = mount();
    await flush();
    click(button(h, 'Manage Participants (1)'));
    const nameInput = byLabel(h, 'New friend name');
    type(nameInput, 'Sam Kim');
    submit(nameInput);
    click(button(h, 'Close'));
    click(h.querySelector('button[aria-label="Assign to people"]')!);
    const boxes = h.querySelectorAll('.assign__row input[type="checkbox"]');
    click(boxes[1]!);
    click(button(h, 'Done'));
    expect(h.querySelector('.pill')?.textContent).toBe('SK');

    click(h.querySelector('[aria-label="Options for Sam Kim"]')!);
    click(h.querySelector('[aria-label="Remove Sam Kim from bill"]')!);
    expect(h.querySelector('.pill')).toBeNull();

    click(button(h, 'Manage Participants (1)'));
    click(h.querySelector('.friends__row:not(.friends__row--me) input[type="checkbox"]')!);
    click(button(h, 'Close'));
    expect(h.querySelector('.pill')).toBeNull();
  });

  it('manage participants opens above the assign dialog', async () => {
    seedMe('Ryan');
    const h = mount();
    await flush();
    click(h.querySelector('button[aria-label="Assign to people"]')!);
    expect(h.querySelector('[aria-label="Assign"]')).toBeTruthy();

    click(button(h, 'Manage participants'));
    expect(h.querySelector('[aria-label="Assign"]')).toBeTruthy();
    expect(h.querySelector('[aria-label="Manage Participants"]')).toBeTruthy();
    expect(h.querySelector('.calc.friends')).toBeTruthy();

    click(button(h, 'Close'));
    expect(h.querySelector('[aria-label="Manage Participants"]')).toBeNull();
    expect(h.querySelector('[aria-label="Assign"]')).toBeTruthy();
  });

  it('a link with assignees restores pills for participants on the bill', async () => {
    seedMe('Ryan');
    const st = minimalState([{ id: 'id-sam', name: 'Sam' }]);
    st.items = [{ ...st.items[0]!, assignees: ['id-sam', 'ghost'] }];
    window.location.hash = `#s=${await encodeState(st)}`;
    const h = mount();
    await flush();
    expect([...h.querySelectorAll('.pill')].map((p) => p.textContent)).toEqual(['S']);
  });
});
