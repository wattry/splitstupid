import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { PostHogContext } from '@posthog/react';
import { Calculator } from '../../src/components/inputs/Calculator.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount() {
  const capture = vi.fn();
  const host = document.createElement('div');
  document.body.appendChild(host);
  act(() => {
    createRoot(host).render(
      React.createElement(
        PostHogContext.Provider,
        { value: { client: { capture } as never } },
        React.createElement(Calculator)
      )
    );
  });
  return { host, capture };
}

const click = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const key = (host: Element, label: string) =>
  click([...host.querySelectorAll('.calculator__key')].find((b) => b.textContent === label)!);

describe('Calculator', () => {
  it('opens from an SVG icon button rather than an emoji', () => {
    const { host } = mount();
    const fab = host.querySelector('.fab')!;
    expect(fab.querySelector('svg')).not.toBeNull();
    expect(fab.textContent).toBe('');
  });

  it('tracks open and close with how many keys were pressed', () => {
    const { host, capture } = mount();
    click(host.querySelector('.fab')!);
    expect(capture).toHaveBeenCalledWith('calculator_opened', {});
    key(host, '7');
    key(host, '+');
    key(host, '2');
    key(host, '=');
    click(host.querySelector('.calculator__close')!);
    expect(capture).toHaveBeenCalledWith('calculator_closed', { keys_pressed: 4, evaluated: true, via: 'close' });
  });

  it('reports no evaluation when = was never pressed', () => {
    const { host, capture } = mount();
    click(host.querySelector('.fab')!);
    key(host, '5');
    click(host.querySelector('.calculator__close')!);
    expect(capture).toHaveBeenCalledWith('calculator_closed', { keys_pressed: 1, evaluated: false, via: 'close' });
  });
});
