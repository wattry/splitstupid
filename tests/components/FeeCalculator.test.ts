import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { PostHogContext } from '@posthog/react';
import { FeeCalculator } from '../../src/components/inputs/FeeCalculator.js';
import type { Fee } from '../../src/types.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const fee = (id: string, label: string, amount: string): Fee => ({ id, label, amount });

function mount(initial: Fee[]) {
  const capture = vi.fn();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  let latest = initial;
  const onChange = vi.fn((next: Fee[]) => { latest = next; render(); });
  const render = () => act(() => {
    root.render(
      React.createElement(
        PostHogContext.Provider,
        { value: { client: { capture } as never } },
        React.createElement(FeeCalculator, { fees: latest, onChange })
      )
    );
  });
  render();
  return { host, capture, onChange, fees: () => latest };
}

const click = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const type = (el: Element, value: string) => act(() => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
const open = (host: Element) => click(host.querySelector('.feecalc__toggle')!);

describe('FeeCalculator', () => {
  it('shows each existing fee as its own labelled row', () => {
    const { host } = mount([fee('a', 'Tax', '1.50'), fee('b', 'Service', '2')]);
    open(host);
    const rows = host.querySelectorAll('.feecalc__row');
    expect(rows).toHaveLength(2);
    expect((rows[1]!.querySelector('input[type="text"]') as HTMLInputElement).value).toBe('Service');
    expect((rows[1]!.querySelector('input[type="number"]') as HTMLInputElement).value).toBe('2');
  });

  it('opens with one blank row when there are no fees yet', () => {
    const { host, fees } = mount([]);
    open(host);
    expect(host.querySelectorAll('.feecalc__row')).toHaveLength(1);
    expect(fees()).toHaveLength(1);
  });

  it('edits apply live to the parent', () => {
    const { host, fees } = mount([fee('a', 'Tax', '1')]);
    open(host);
    type(host.querySelector('.feecalc__row input[type="number"]')!, '4.25');
    expect(fees()[0]!.amount).toBe('4.25');
    type(host.querySelector('.feecalc__row input[type="text"]')!, 'VAT');
    expect(fees()[0]!.label).toBe('VAT');
  });

  it('adds and removes rows', () => {
    const { host, fees } = mount([fee('a', 'Tax', '1')]);
    open(host);
    click(host.querySelector('.feecalc__add')!);
    expect(fees()).toHaveLength(2);
    click(host.querySelectorAll('.feecalc__remove')[0]!);
    expect(fees()).toHaveLength(1);
    expect(fees()[0]!.id).not.toBe('a');
  });

  it('drops rows blank in both fields when closed', () => {
    const { host, fees } = mount([fee('a', 'Tax', '1'), fee('b', '', '')]);
    open(host);
    click(host.querySelector('.feecalc__done')!);
    expect(fees().map((f) => f.id)).toEqual(['a']);
    expect(host.querySelector('.feecalc__panel')).toBeNull();
  });

  it('shows the running sum', () => {
    const { host } = mount([fee('a', 'Tax', '1.5'), fee('b', 'Svc', '2')]);
    open(host);
    expect(host.querySelector('.feecalc__sum')!.textContent).toContain('$3.50');
  });

  it('tracks open, add, remove and close with a fee summary', () => {
    const { host, capture } = mount([fee('a', 'Tax', '1')]);
    open(host);
    expect(capture).toHaveBeenCalledWith('fee_calculator_opened', { fee_count: 1, labeled_count: 1, total: 1 });
    click(host.querySelector('.feecalc__add')!);
    expect(capture).toHaveBeenCalledWith('fee_added', { fee_count: 2 });
    click(host.querySelectorAll('.feecalc__remove')[1]!);
    expect(capture).toHaveBeenCalledWith('fee_removed', { fee_count: 1 });
    click(host.querySelector('.feecalc__done')!);
    expect(capture).toHaveBeenCalledWith('fee_calculator_closed', { fee_count: 1, labeled_count: 1, total: 1, via: 'done' });
  });
});
