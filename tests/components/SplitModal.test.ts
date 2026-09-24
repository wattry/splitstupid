import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { SplitModal } from '../../src/components/SplitModal.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(max: number) {
  const onSplit = vi.fn();
  const onClose = vi.fn();
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(React.createElement(SplitModal, { max, desc: 'Beer', onSplit, onClose }));
  });
  return { host, onSplit, onClose };
}

const click = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const button = (host: Element, label: string) =>
  [...host.querySelectorAll('button')].find((b) => b.textContent === label)!;
const type = (input: HTMLInputElement, value: string) => act(() => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});

describe('SplitModal', () => {
  it('is titled Split and defaults the count to 1 with max set to the unit count', () => {
    const { host } = mount(4);
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Split');
    expect(host.querySelector('h2')?.textContent).toBe('Split');
    const input = host.querySelector('input')!;
    expect(input.value).toBe('1');
    expect(input.getAttribute('min')).toBe('1');
    expect(input.getAttribute('max')).toBe('4');
  });

  it('submits the typed count', () => {
    const { host, onSplit } = mount(4);
    type(host.querySelector('input')!, '3');
    click(button(host, 'Split'));
    expect(onSplit).toHaveBeenCalledWith(3);
  });

  it('clamps the count into 1..max on submit', () => {
    const { host, onSplit } = mount(4);
    type(host.querySelector('input')!, '9');
    click(button(host, 'Split'));
    expect(onSplit).toHaveBeenCalledWith(4);
    type(host.querySelector('input')!, '0');
    click(button(host, 'Split'));
    expect(onSplit).toHaveBeenLastCalledWith(1);
  });

  it('cancel closes without splitting', () => {
    const { host, onSplit, onClose } = mount(4);
    click(button(host, 'Cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(onSplit).not.toHaveBeenCalled();
  });
});
