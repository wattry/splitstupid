import { describe, it, expect } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { ByPerson } from '../../src/components/ByPerson.js';
import type { Item, Participant } from '../../src/types.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const people: Participant[] = [{ id: 'me', name: '' }, { id: 'sam', name: 'Sam' }];
const row = (id: string, desc: string, assignees?: string[]): Item => ({ id, units: '1', yours: '1', desc, price: '1', ...(assignees ? { assignees } : {}) });

function mount(items: Item[]) {
  const host = document.createElement('div'); document.body.appendChild(host);
  act(() => { createRoot(host).render(React.createElement(ByPerson, { items, participants: people })); });
  return host;
}

describe('ByPerson', () => {
  it('renders nothing when no row is assigned', () => {
    expect(mount([row('a', 'Soup')]).innerHTML).toBe('');
  });
  it('groups descriptions per person with Unassigned last and "item" for blank descriptions', () => {
    const host = mount([row('a', 'Soup', ['sam', 'me']), row('b', '', ['sam']), row('c', 'Tea')]);
    expect(host.querySelector('h3')?.textContent).toBe('By person');
    const heads = [...host.querySelectorAll('.byperson__name')].map((e) => e.textContent);
    expect(heads).toEqual(['Me', 'Sam', 'Unassigned']);
    const samItems = [...host.querySelectorAll('.byperson__group')[1]!.querySelectorAll('li')].map((e) => e.textContent);
    expect(samItems).toEqual(['Soup', 'item']);
  });
});
