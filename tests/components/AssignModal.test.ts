import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { AssignModal } from '../../src/components/AssignModal.js';
import type { Participant } from '../../src/types.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const people: Participant[] = [{ id: 'me', name: '' }, { id: 'sam', name: 'Sam' }];

function mount(desc = 'Beer', assigned: string[] = ['sam'], partial: string[] = []) {
  const onToggle = vi.fn(); const onManage = vi.fn(); const onClose = vi.fn();
  const host = document.createElement('div'); document.body.appendChild(host);
  act(() => { createRoot(host).render(React.createElement(AssignModal, { desc, participants: people, assigned, partial, onToggle, onManage, onClose })); });
  return { host, onToggle, onManage, onClose };
}
const click = (el: Element) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const button = (host: Element, label: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;

describe('AssignModal', () => {
  it('is a dialog titled Assign naming the row, Me first, with current assignees checked', () => {
    const { host } = mount();
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Assign');
    expect(host.querySelector('h2')?.textContent).toBe('Assign');
    expect(host.textContent).toContain('Beer');
    const labels = [...host.querySelectorAll('.assign__row .assign__name')].map((e) => e.textContent);
    expect(labels).toEqual(['Me', 'Sam']);
    const boxes = [...host.querySelectorAll<HTMLInputElement>('.assign__row input[type="checkbox"]')];
    expect(boxes.map((b) => b.checked)).toEqual([false, true]);
  });
  it('says "this item" for a blank description', () => {
    const { host } = mount('');
    expect(host.textContent).toContain('this item');
  });
  it('renders a partial id as indeterminate and an assigned id as checked but not indeterminate', () => {
    const { host } = mount('Beer', ['sam'], ['me']);
    const boxes = [...host.querySelectorAll<HTMLInputElement>('.assign__row input[type="checkbox"]')];
    expect(boxes[0]!.indeterminate).toBe(true);
    expect(boxes[1]!.checked).toBe(true);
    expect(boxes[1]!.indeterminate).toBe(false);
  });

  it('toggles, manages and closes', () => {
    const { host, onToggle, onManage, onClose } = mount();
    click(host.querySelectorAll('.assign__row input[type="checkbox"]')[0]!);
    expect(onToggle).toHaveBeenCalledWith('me');
    click(button(host, 'Manage participants'));
    expect(onManage).toHaveBeenCalled();
    click(button(host, 'Done'));
    expect(onClose).toHaveBeenCalled();
  });
});
