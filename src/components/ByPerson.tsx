import React from 'react';
import type { ReactElement } from 'react';
import type { Fee, Item, Participant } from '../types.js';
import { extrasFor, groupByParticipant, lineLabel, type ExtraLine, type PersonLine } from '../lib/assign.js';
import { money, round2 } from '../lib/calculate.js';

export interface ByPersonProps {
  items: Item[];
  participants: Participant[];
  perUnit: boolean;
  /** Whole-bill fees, tip and Sub Total; each person gets a share in proportion to their items. */
  fees?: Fee[];
  tipAmount?: string;
  billSubtotal?: string;
}

/** Read-only view of who has what. Hidden until at least one row is assigned. */
export function ByPerson(props: ByPersonProps): ReactElement | null {
  const { items, participants, perUnit, fees = [], tipAmount = '', billSubtotal = '' } = props;
  const { groups, unassigned, unassignedTotal } = groupByParticipant(items, participants, perUnit);
  if (groups.length === 0) return null;
  const extras = (subtotal: number) => extrasFor(subtotal, fees, tipAmount, billSubtotal);
  const withExtras = (subtotal: number, lines: ExtraLine[]) =>
    round2(lines.reduce((sum, l) => sum + l.amount, subtotal));
  let total = 0;
  const block = (key: string, name: string, lines: PersonLine[], subtotal: number) => {
    const extraLines = extras(subtotal);
    const groupTotal = withExtras(subtotal, extraLines);
    total += groupTotal;
    return (
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
          {extraLines.map((line, i) => (
            <li key={`extra-${i}`} className="byperson__extra">
              <span>{line.label}</span>
              <span className="byperson__amount">{money(line.amount)}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  };
  const blocks = [
    ...groups.map((g) => block(g.participant.id, g.participant.name || 'Me', g.lines, g.total)),
    ...(unassigned.length > 0 ? [block('unassigned', 'Unassigned', unassigned, unassignedTotal)] : []),
  ];
  return (
    <div className="byperson">
      <h3 className="byperson__title">By person</h3>
      {blocks}
      <p className="byperson__sum">
        <span>Total</span>
        <span className="byperson__amount">{money(round2(total))}</span>
      </p>
    </div>
  );
}
