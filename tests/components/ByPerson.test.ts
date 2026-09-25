import { describe, it, expect } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { ByPerson } from '../../src/components/ByPerson.js';
import type { Item, Participant } from '../../src/types.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const people: Participant[] = [{ id: 'me', name: '' }, { id: 'sam', name: 'Sam' }];
const row = (id: string, desc: string, assignees?: string[]): Item => ({ id, units: '1', yours: '1', desc, price: '1', ...(assignees ? { assignees } : {}) });

function mount(items: Item[], perUnit = false) {
  const host = document.createElement('div'); document.body.appendChild(host);
  act(() => { createRoot(host).render(React.createElement(ByPerson, { items, participants: people, perUnit })); });
  return host;
}

describe('ByPerson', () => {
  it('renders nothing when no row is assigned', () => {
    expect(mount([row('a', 'Soup')]).innerHTML).toBe('');
  });
  it('groups descriptions per person with Unassigned last and "item" for blank descriptions', () => {
    const host = mount([row('a', 'Soup', ['sam', 'me']), row('b', '', ['sam']), row('c', 'Tea')]);
    expect(host.querySelector('h3')?.textContent).toBe('By person');
    const heads = [...host.querySelectorAll('.byperson__label')].map((e) => e.textContent);
    expect(heads).toEqual(['Me', 'Sam', 'Unassigned']);
    const samItems = [...host.querySelectorAll('.byperson__group')[1]!.querySelectorAll('li span:first-child')].map((e) => e.textContent);
    expect(samItems).toEqual(['Soup', 'item']);
  });
  it('shows each group subtotal, each line share, unassigned totals, and the section total', () => {
    const a = row('a', 'Soup', ['sam', 'me']); a.price = '10';
    const b = row('b', 'Tea'); b.price = '4';
    const host = mount([a, b]);
    const meGroup = host.querySelectorAll('.byperson__group')[0]!;
    expect(meGroup.querySelector('.byperson__total')?.textContent).toBe('$5.00');
    expect(meGroup.querySelector('.byperson__amount')?.textContent).toBe('$5.00');
    const unassignedGroup = [...host.querySelectorAll('.byperson__group')].find((g) => g.textContent?.includes('Unassigned'))!;
    expect(unassignedGroup.querySelector('.byperson__total')?.textContent).toBe('$4.00');
    expect(unassignedGroup.querySelector('.byperson__amount')?.textContent).toBe('$4.00');
    const sum = host.querySelector('.byperson__sum')!;
    expect(sum.textContent).toBe('Total$14.00');
  });
  it('shows the unit count when one person has the whole row, but not when it is shared', () => {
    const solo = row('a', 'Soup', ['me']); solo.units = '2';
    const shared = row('a', 'Soup', ['me', 'sam']); shared.units = '2';
    const soloHost = mount([solo]);
    expect(soloHost.querySelector('.byperson__group li span:first-child')?.textContent).toBe('2× Soup');
    const sharedHost = mount([shared]);
    const spans = [...sharedHost.querySelectorAll('.byperson__group li span:first-child')].map((e) => e.textContent);
    expect(spans).toEqual(['Soup', 'Soup']);
  });
});
