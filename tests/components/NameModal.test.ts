import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { NameModal } from '../../src/components/NameModal.js';
import type { FriendResult } from '../../src/lib/friends.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount() {
  const onSave = vi.fn<(name: string) => FriendResult>((name) => ({ ok: true, friend: { id: 'me', name }, friends: [] }));
  const onDone = vi.fn();
  const onCancel = vi.fn();
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => { createRoot(host).render(React.createElement(NameModal, { onSave, onDone, onCancel })); });
  return { host, onSave, onDone, onCancel };
}

const click = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const button = (host: Element, label: string) =>
  [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
const type = (input: HTMLInputElement, value: string) => act(() => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
const submit = (input: HTMLInputElement) => act(() => {
  input.form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
});

describe('NameModal', () => {
  it('asks for a name', () => {
    const { host } = mount();
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe("What's your name?");
    expect(host.querySelector('h2')?.textContent).toBe("What's your name?");
    expect(host.querySelector('input')?.getAttribute('placeholder')).toBe('Your name');
  });

  it('saves then calls onDone on Continue', () => {
    const { host, onSave, onDone } = mount();
    const input = host.querySelector('input')!;
    type(input, 'Ryan');
    submit(input);
    expect(onSave).toHaveBeenCalledWith('Ryan');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('shows the error and does not call onDone when save fails', () => {
    const { host, onSave, onDone } = mount();
    onSave.mockReturnValueOnce({ ok: false, error: 'empty' });
    submit(host.querySelector('input')!);
    expect(host.textContent).toContain('Enter a name.');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('cancels', () => {
    const { host, onCancel, onSave } = mount();
    click(button(host, 'Cancel'));
    expect(onCancel).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
