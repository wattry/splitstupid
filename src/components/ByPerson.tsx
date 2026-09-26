import React from 'react';
import type { ReactElement } from 'react';
import type { Fee, Item, Participant } from '../types.js';
import { allocateExtras, groupByParticipant, lineLabel, type ExtraLine, type PersonLine } from '../lib/assign.js';
import { money, round2 } from '../lib/calculate.js';
import { feeTotal } from '../lib/fees.js';

export interface ByPersonProps {
  items: Item[];
  participants: Participant[];
  perUnit: boolean;
  /** Whole-bill fees, tip and Sub Total; each person gets a share in proportion to their items. */
  fees?: Fee[];
  tipAmount?: string;
  billSubtotal?: string;
}

/**
 * Read-only view of who has what. Hidden until at least one row is assigned.
 * With a Sub Total, the footer also shows the whole bill (Sub Total + fees +
 * tip) so the per-person totals can be checked against it.
 */
export function ByPerson(props: ByPersonProps): ReactElement | null {
  const { items, participants, perUnit, fees = [], tipAmount = '', billSubtotal = '' } = props;
  const { groups, unassigned, unassignedTotal } = groupByParticipant(items, participants, perUnit);
  if (groups.length === 0) return null;
  const entries = [
    ...groups.map((g) => ({ key: g.participant.id, name: g.participant.name || 'Me', lines: g.lines, subtotal: g.total })),
    ...(unassigned.length > 0
      ? [{ key: 'unassigned', name: 'Unassigned', lines: unassigned, subtotal: unassignedTotal }]
      : []),
  ];
  // Fees and tip are split across everyone at once, in whole cents, so they add up.
  const extras = allocateExtras(entries.map((e) => e.subtotal), fees, tipAmount, billSubtotal);
  const withExtras = (subtotal: number, lines: ExtraLine[]) =>
    round2(lines.reduce((sum, l) => sum + l.amount, subtotal));
  let total = 0;
  const block = (key: string, name: string, lines: PersonLine[], subtotal: number, extraLines: ExtraLine[]) => {
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
  const subNum = parseFloat(billSubtotal);
  const billTotal = subNum > 0 ? round2(subNum + feeTotal(fees) + (parseFloat(tipAmount) || 0)) : null;
  const blocks = entries.map((e, i) => block(e.key, e.name, e.lines, e.subtotal, extras[i]!));
  return (
    <div className="byperson">
      <h3 className="byperson__title">By person</h3>
      {blocks}
      <p className="byperson__sum">
        <span>Total</span>
        <span className="byperson__amount">{money(round2(total))}</span>
      </p>
      {billTotal !== null && <>
        <p className="byperson__bill">
          <span>Bill total</span>
          <span className="byperson__amount">{money(billTotal)}</span>
        </p>
        {Math.abs(round2(total) - billTotal) >= 0.01 && (
          <p className="byperson__off" role="status">
            {`Off by ${money(Math.abs(round2(round2(total) - billTotal)))}`}
          </p>
        )}
      </>}
    </div>
  );
}
