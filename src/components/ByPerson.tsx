import React from 'react';
import type { ReactElement } from 'react';
import type { Item, Participant } from '../types.js';
import { groupByParticipant, lineLabel, type PersonLine } from '../lib/assign.js';
import { money } from '../lib/calculate.js';

export interface ByPersonProps { items: Item[]; participants: Participant[]; perUnit: boolean }

/** Read-only view of who has what. Hidden until at least one row is assigned. */
export function ByPerson({ items, participants, perUnit }: ByPersonProps): ReactElement | null {
  const { groups, unassigned, unassignedTotal, total } = groupByParticipant(items, participants, perUnit);
  if (groups.length === 0) return null;
  const block = (key: string, name: string, lines: PersonLine[], groupTotal: number) => (
    <section key={key} className="byperson__group">
      <h4 className="byperson__name">
        <span className="byperson__label">{name}</span>
        <span className="byperson__total">{money(groupTotal)}</span>
      </h4>
      <ul className="byperson__items">
        {lines.map((line) => (
          <li key={line.item.id}>
            <span>{lineLabel(line)}</span>
            <span className="byperson__amount">{money(line.share)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
  return (
    <div className="byperson">
      <h3 className="byperson__title">By person</h3>
      {groups.map((g) => block(g.participant.id, g.participant.name || 'Me', g.lines, g.total))}
      {unassigned.length > 0 && block('unassigned', 'Unassigned', unassigned, unassignedTotal)}
      <p className="byperson__sum">
        <span>Total</span>
        <span className="byperson__amount">{money(total)}</span>
      </p>
    </div>
  );
}
