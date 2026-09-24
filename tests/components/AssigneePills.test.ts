import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { AssigneePills } from '../../src/components/AssigneePills.js';
import { shortLabels } from '../../src/lib/assign.js';
import type { Participant } from '../../src/types.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const people: Participant[] = [{ id: 'me', name: 'Ryan Wattrus' }, { id: 'sam', name: 'Sam' }];

function mount(ids: string[]) {
  const onClick = vi.fn();
  const host = document.createElement('div'); document.body.appendChild(host);
  act(() => { createRoot(host).render(React.createElement(AssigneePills, { ids, participants: people, labels: shortLabels(people), onClick })); });
  return { host, onClick };
}

describe('AssigneePills', () => {
  it('renders nothing for no ids', () => {
    expect(mount([]).host.innerHTML).toBe('');
  });
  it('renders a labelled pill per id and calls onClick', () => {
    const { host, onClick } = mount(['sam', 'me', 'ghost']);
    const pills = [...host.querySelectorAll<HTMLButtonElement>('.pill')];
    expect(pills.map((p) => p.textContent)).toEqual(['S', 'RW']);
    expect(pills[1]!.getAttribute('aria-label')).toBe('Ryan Wattrus');
    act(() => { pills[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(onClick).toHaveBeenCalled();
  });
});
