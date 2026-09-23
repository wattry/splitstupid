import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { ScanText } from '../../src/components/ScanText.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(onImport: (t: string) => number, onSave: (t: string) => void = () => {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(React.createElement(ScanText, { text: '1 Beer 5.00', onImport, onSave, onHide: () => {} }));
  });
  return host;
}

const click = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

describe('ScanText editor', () => {
  it('imports the edited draft and closes when items were found', () => {
    const onImport = vi.fn(() => 2);
    const host = mount(onImport);
    click(host.querySelector('.scan-text__open')!);
    const ta = host.querySelector('textarea')!;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(ta, '2 Beer 10.00');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    });
    click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Import')!);
    expect(onImport).toHaveBeenCalledWith('2 Beer 10.00');
    expect(host.querySelector('textarea')).toBeNull();
  });

  it('saves the edited draft without importing and closes', () => {
    const onImport = vi.fn(() => 2);
    const onSave = vi.fn();
    const host = mount(onImport, onSave);
    click(host.querySelector('.scan-text__open')!);
    const ta = host.querySelector('textarea')!;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(ta, 'edited');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    });
    click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Save')!);
    expect(onSave).toHaveBeenCalledWith('edited');
    expect(onImport).not.toHaveBeenCalled();
    expect(host.querySelector('textarea')).toBeNull();
  });

  it('stays open with a hint when nothing was found', () => {
    const host = mount(() => 0);
    click(host.querySelector('.scan-text__open')!);
    click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Import')!);
    expect(host.querySelector('textarea')).not.toBeNull();
    expect(host.textContent).toContain('No line items found');
  });
});
