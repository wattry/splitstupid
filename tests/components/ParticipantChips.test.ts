import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { ParticipantChips } from '../../src/components/ParticipantChips.js';
import type { FriendResult } from '../../src/lib/friends.js';
import type { Friend, Participant } from '../../src/types.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const sam: Friend = { id: 'id-sam', name: 'Sam' };
const known: Participant = { id: 'id-sam', name: 'Sam' };
const stranger: Participant = { id: 'id-jo', name: 'Jo' };

function mount(participants: Participant[], friends: Friend[] = [sam], meId = 'id-me') {
  const onRemove = vi.fn();
  const onImport = vi.fn<(p: Participant, name?: string) => FriendResult>((p, name) => ({
    ok: true,
    friend: { id: p.id, name: name ?? p.name },
    friends,
  }));
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(React.createElement(ParticipantChips, { participants, friends, meId, onRemove, onImport }));
  });
  return { host, onRemove, onImport };
}

const click = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const type = (input: HTMLInputElement, value: string) => act(() => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
const submit = (input: HTMLInputElement) => act(() => {
  input.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
});

describe('ParticipantChips', () => {
  it('renders nothing with no participants', () => {
    const { host } = mount([]);
    expect(host.innerHTML).toBe('');
  });

  it('shows a chip per participant with a remove button', () => {
    const { host, onRemove } = mount([known, stranger]);
    expect([...host.querySelectorAll('.chip__name')].map((el) => el.textContent)).toEqual(['Sam', 'Jo']);
    click(host.querySelector('button[aria-label="Remove Sam from bill"]')!);
    expect(onRemove).toHaveBeenCalledWith('id-sam');
  });

  it('offers Add only for participants not in the friend list', () => {
    const { host } = mount([known, stranger]);
    expect(host.querySelector('button[aria-label="Add Sam to friends"]')).toBeNull();
    expect(host.querySelector('button[aria-label="Add Jo to friends"]')).toBeTruthy();
  });

  it('imports with the snapshot name on Add', () => {
    const { host, onImport } = mount([stranger]);
    click(host.querySelector('button[aria-label="Add Jo to friends"]')!);
    expect(onImport).toHaveBeenCalledWith(stranger, undefined);
    expect(host.querySelector('input')).toBeNull();
  });

  it('opens an inline rename when the import collides, then imports under the new name', () => {
    const { host, onImport } = mount([stranger]);
    onImport.mockReturnValueOnce({ ok: false, error: 'duplicate', existing: { id: 'x', name: 'Jo' } });
    click(host.querySelector('button[aria-label="Add Jo to friends"]')!);
    expect(host.textContent).toContain('You already have a friend named Jo.');
    const input = host.querySelector('input[aria-label="Name for Jo"]') as HTMLInputElement;
    expect(input.value).toBe('Jo');
    type(input, 'Jo B');
    submit(input);
    expect(onImport).toHaveBeenLastCalledWith(stranger, 'Jo B');
    expect(host.querySelector('input')).toBeNull();
  });

  it('cancels the inline rename', () => {
    const { host, onImport } = mount([stranger]);
    onImport.mockReturnValueOnce({ ok: false, error: 'duplicate', existing: { id: 'x', name: 'Jo' } });
    click(host.querySelector('button[aria-label="Add Jo to friends"]')!);
    click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Cancel')!);
    expect(host.querySelector('input')).toBeNull();
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it('renders Me without remove or add buttons and with a placeholder when blank', () => {
    const { host } = mount([{ id: 'id-me', name: '' }, stranger], []);
    expect([...host.querySelectorAll('.chip__name')].map((el) => el.textContent)).toEqual(['Me', 'Jo']);
    expect(host.querySelector('button[aria-label="Remove Me from bill"]')).toBeNull();
    expect(host.querySelector('button[aria-label="Add Me to friends"]')).toBeNull();
    expect(host.querySelector('button[aria-label="Remove Jo from bill"]')).toBeTruthy();
  });
});
