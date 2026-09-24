import React from 'react';
import type { ReactElement } from 'react';
import type { Item, Participant } from '../types.js';
import { groupByParticipant } from '../lib/assign.js';

export interface ByPersonProps { items: Item[]; participants: Participant[] }

/** Read-only view of who has what. Hidden until at least one row is assigned. */
export function ByPerson({ items, participants }: ByPersonProps): ReactElement | null {
  const { groups, unassigned } = groupByParticipant(items, participants);
  if (groups.length === 0) return null;
  const block = (key: string, name: string, rows: Item[]) => (
    <section key={key} className="byperson__group">
      <h4 className="byperson__name">{name}</h4>
      <ul className="byperson__items">
        {rows.map((it) => <li key={it.id}>{it.desc.trim() || 'item'}</li>)}
      </ul>
    </section>
  );
  return (
    <div className="byperson">
      <h3 className="byperson__title">By person</h3>
      {groups.map((g) => block(g.participant.id, g.participant.name || 'Me', g.items))}
      {unassigned.length > 0 && block('unassigned', 'Unassigned', unassigned)}
    </div>
  );
}
