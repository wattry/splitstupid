import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { FriendsManager, friendErrorMessage } from '../../src/components/FriendsManager.js';
import type { FriendResult } from '../../src/lib/friends.js';
import type { Friend, Participant } from '../../src/types.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const sam: Friend = { id: 'id-sam', name: 'Sam' };
const alex: Friend = { id: 'id-alex', name: 'Alex Kim' };

const okResult = (friend: Friend, friends: Friend[]): FriendResult => ({ ok: true, friend, friends });

const me = { id: 'id-me', name: 'Ryan' };

function mount(friends: Friend[] = [sam, alex], participants: Participant[] = [sam], meOverride = me) {
  const onToggle = vi.fn();
  const onAdd = vi.fn<(name: string) => FriendResult>((name) =>
    okResult({ id: 'new', name }, [...friends, { id: 'new', name }])
  );
  const onRename = vi.fn<(id: string, name: string) => FriendResult>((id, name) =>
    okResult({ id, name }, friends)
  );
  const onRenameMe = vi.fn<(name: string) => FriendResult>((name) => okResult({ id: meOverride.id, name }, friends));
  const onDelete = vi.fn();
  const onClose = vi.fn();
  const onAdopt = vi.fn<(id: string) => { ok: boolean; error?: string }>(() => ({ ok: true }));
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(
      React.createElement(FriendsManager, {
        friends, participants, me: meOverride, onToggle, onAdd, onRename, onRenameMe, onDelete, onClose, onAdopt,
      })
    );
  });
  return { host, onToggle, onAdd, onRename, onRenameMe, onDelete, onClose, onAdopt };
}

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
const rowNames = (host: Element) =>
  [...host.querySelectorAll('.friends__row:not(.friends__row--me) .friends__name')].map((el) => el.textContent);

describe('friendErrorMessage', () => {
  it('spells out both errors', () => {
    expect(friendErrorMessage({ ok: false, error: 'empty' })).toBe('Enter a name.');
    expect(friendErrorMessage({ ok: false, error: 'duplicate', existing: sam })).toBe(
      'You already have a friend named Sam.'
    );
  });
});

describe('FriendsManager list view', () => {
  it('is a dialog titled Manage Participants listing friends sorted by name with participants checked', () => {
    const { host } = mount();
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Manage Participants');
    expect(rowNames(host)).toEqual(['Alex Kim', 'Sam']);
    const boxes = [
      ...host.querySelectorAll<HTMLInputElement>('.friends__row:not(.friends__row--me) input[type="checkbox"]'),
    ];
    expect(boxes.map((b) => b.checked)).toEqual([false, true]);
  });

  it('shows the empty state when there are no friends', () => {
    const { host } = mount([], []);
    expect(host.textContent).toContain('No friends yet. Add one above.');
  });

  it('toggles a participant when a checkbox is clicked', () => {
    const { host, onToggle } = mount();
    click(host.querySelectorAll('.friends__row:not(.friends__row--me) input[type="checkbox"]')[0]!);
    expect(onToggle).toHaveBeenCalledWith(alex);
  });

  it('filters the list by the search query', () => {
    const { host } = mount();
    type(byLabel(host, 'Search friends'), 'kim');
    expect(rowNames(host)).toEqual(['Alex Kim']);
  });

  it('adds on submit, toggles the new friend onto the bill, and clears the input', () => {
    const { host, onAdd, onToggle } = mount();
    const input = byLabel(host, 'New friend name');
    type(input, 'Jo');
    submit(input);
    expect(onAdd).toHaveBeenCalledWith('Jo');
    expect(onToggle).toHaveBeenCalledWith({ id: 'new', name: 'Jo' });
    expect(input.value).toBe('');
  });

  it('shows the error and keeps the draft when add fails', () => {
    const { host, onAdd, onToggle } = mount();
    onAdd.mockReturnValueOnce({ ok: false, error: 'duplicate', existing: sam });
    const input = byLabel(host, 'New friend name');
    type(input, 'sam');
    submit(input);
    expect(host.textContent).toContain('You already have a friend named Sam.');
    expect(input.value).toBe('sam');
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('closes from the close button', () => {
    const { host, onClose } = mount();
    click(button(host, 'Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape when focus is inside the dialog', () => {
    const { host, onClose } = mount();
    act(() => {
      host.querySelector('[role="dialog"]')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close on Escape in the search input while it has a query', () => {
    const { host, onClose } = mount();
    const input = byLabel(host, 'Search friends');
    type(input, 'kim');
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape in the search input when it is empty', () => {
    const { host, onClose } = mount();
    const input = byLabel(host, 'Search friends');
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('FriendsManager edit view', () => {
  it('opens prefilled from the edit button and saves a rename', () => {
    const { host, onRename } = mount();
    click(host.querySelector('.friends__row button[aria-label="Edit Alex Kim"]')!);
    const input = byLabel(host, 'Friend name');
    expect(input.value).toBe('Alex Kim');
    type(input, 'Alex K');
    submit(input);
    expect(onRename).toHaveBeenCalledWith('id-alex', 'Alex K');
    // Back on the list after a successful save.
    expect(byLabel(host, 'Search friends')).toBeTruthy();
  });

  it('shows the rename error and stays on the edit view', () => {
    const { host, onRename } = mount();
    onRename.mockReturnValueOnce({ ok: false, error: 'empty' });
    click(host.querySelector('.friends__row button[aria-label="Edit Alex Kim"]')!);
    const input = byLabel(host, 'Friend name');
    type(input, '');
    submit(input);
    expect(host.textContent).toContain('Enter a name.');
    expect(byLabel(host, 'Friend name')).toBeTruthy();
  });

  it('deletes only on the second tap', () => {
    const { host, onDelete } = mount();
    click(host.querySelector('.friends__row button[aria-label="Edit Alex Kim"]')!);
    click(button(host, 'Delete'));
    expect(onDelete).not.toHaveBeenCalled();
    click(button(host, 'Confirm delete'));
    expect(onDelete).toHaveBeenCalledWith('id-alex');
    expect(byLabel(host, 'Search friends')).toBeTruthy();
  });

  it('goes back without saving', () => {
    const { host, onRename } = mount();
    click(host.querySelector('.friends__row button[aria-label="Edit Alex Kim"]')!);
    click(button(host, 'Back'));
    expect(onRename).not.toHaveBeenCalled();
    expect(byLabel(host, 'Search friends')).toBeTruthy();
  });

  it('focuses the edit input, not the card, after opening it', () => {
    const { host } = mount();
    click(host.querySelector('.friends__row button[aria-label="Edit Alex Kim"]')!);
    expect(document.activeElement).toBe(byLabel(host, 'Friend name'));
  });

  it('keeps focus on the add input after a successful add', () => {
    const { host } = mount();
    const input = byLabel(host, 'New friend name');
    input.focus();
    type(input, 'Jo');
    submit(input);
    expect(document.activeElement).toBe(byLabel(host, 'New friend name'));
  });

  it('edit view offers a two-tap This is me that calls onAdopt and returns to the list', () => {
    const { host, onAdopt } = mount();
    click(host.querySelector('button[aria-label="Edit Alex Kim"]')!);
    click(button(host, 'This is me'));
    expect(onAdopt).not.toHaveBeenCalled();
    click(button(host, 'Confirm: this is me'));
    expect(onAdopt).toHaveBeenCalledWith('id-alex');
    expect(byLabel(host, 'Search friends')).toBeTruthy();
  });

  it('a refused adopt shows the error and stays on the edit view', () => {
    const { host, onAdopt } = mount();
    onAdopt.mockReturnValueOnce({ ok: false, error: 'You already have a friend named Alex Kim.' });
    click(host.querySelector('button[aria-label="Edit Alex Kim"]')!);
    click(button(host, 'This is me'));
    click(button(host, 'Confirm: this is me'));
    expect(host.textContent).toContain('You already have a friend named Alex Kim.');
    expect(byLabel(host, 'Friend name')).toBeTruthy();
  });

  it('the Me edit view has no This is me button', () => {
    const { host } = mount();
    click(host.querySelector('button[aria-label="Edit Ryan"]')!);
    expect(button(host, 'This is me')).toBeUndefined();
  });
});

describe('FriendsManager Me row', () => {
  it('pins Me first with a disabled checked checkbox and the stored name', () => {
    const { host } = mount();
    const row = host.querySelector('.friends__row--me')!;
    expect(host.querySelector('.friends__list li')).toBe(row);
    const box = row.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(box.checked).toBe(true);
    expect(box.disabled).toBe(true);
    expect(row.querySelector('.friends__name')?.textContent).toBe('Ryan');
  });

  it('shows "Me" while the name is blank', () => {
    const { host } = mount([sam, alex], [sam], { id: 'id-me', name: '' });
    expect(host.querySelector('.friends__row--me .friends__name')?.textContent).toBe('Me');
  });

  it('stays visible when the search matches nobody', () => {
    const { host } = mount();
    type(byLabel(host, 'Search friends'), 'zzz');
    expect(host.querySelector('.friends__row--me')).toBeTruthy();
    expect(rowNames(host)).toEqual([]);
  });

  it('edits Me without a Delete button and saves through onRenameMe', () => {
    const { host, onRenameMe, onRename } = mount();
    click(host.querySelector('button[aria-label="Edit Ryan"]')!);
    expect(host.querySelector('h2')?.textContent).toBe('Your name');
    expect(button(host, 'Delete')).toBeUndefined();
    const input = byLabel(host, 'Your name');
    expect(input.value).toBe('Ryan');
    type(input, 'Ryan W');
    submit(input);
    expect(onRenameMe).toHaveBeenCalledWith('Ryan W');
    expect(onRename).not.toHaveBeenCalled();
    expect(byLabel(host, 'Search friends')).toBeTruthy();
  });

  it('shows the error when renaming Me fails', () => {
    const { host, onRenameMe } = mount();
    onRenameMe.mockReturnValueOnce({ ok: false, error: 'duplicate', existing: sam });
    click(host.querySelector('button[aria-label="Edit Ryan"]')!);
    const input = byLabel(host, 'Your name');
    type(input, 'Sam');
    submit(input);
    expect(host.textContent).toContain('You already have a friend named Sam.');
    expect(byLabel(host, 'Your name')).toBeTruthy();
  });
});
