import type { Item, MakeRow } from '../types.js';
import { assigneesOf } from './assign.js';
import { round2 } from './calculate.js';

/** Unit count as an integer, or NaN when the field isn't a whole number. */
const unitCount = (row: Item): number => {
  const n = Number(row.units);
  return Number.isInteger(n) ? n : NaN;
};

/** A row can be split when it holds two or more whole units. */
export const canSplit = (row: Item): boolean => unitCount(row) >= 2;

/** Most units that can be split out of a row (all of them). */
export const maxSplit = (row: Item): number => (canSplit(row) ? unitCount(row) : 0);

/**
 * Split `count` single units out of `row` into their own rows. Returns the rows
 * that replace the original: the shrunken original first (dropped when every
 * unit was split out), then one row per split unit.
 *
 *  - per-unit mode: every row keeps the same price.
 *  - total mode:    each single gets a rounded unit share; the original keeps
 *                   whatever is left so the prices still sum to the old total.
 *                   When nothing remains, the last single absorbs the rounding.
 *
 * The singles are "yours"; the original keeps its Yours capped at the units it
 * has left. Invalid input returns `[row]` untouched.
 */
export function splitItem(row: Item, count: number, perUnit: boolean, makeRow: MakeRow): Item[] {
  const units = unitCount(row);
  if (!canSplit(row) || !Number.isInteger(count) || count < 1 || count > units) return [row];

  const price = parseFloat(row.price) || 0;
  const unit = perUnit ? price : round2(price / units);
  const remaining = units - count;
  const yours = parseFloat(row.yours) || 0;
  const who = assigneesOf(row);

  const singles = Array.from({ length: count }, () => makeRow({
    units: '1',
    yours: '1',
    desc: row.desc,
    price: perUnit ? row.price : String(unit),
    ...(who.length ? { assignees: [...who] } : {}),
  }));

  if (remaining === 0) {
    const last = singles[count - 1];
    if (!perUnit && last) last.price = String(round2(price - unit * (count - 1)));
    return singles;
  }

  const rest: Item = {
    ...row,
    units: String(remaining),
    yours: String(Math.min(yours, remaining)),
    price: perUnit ? row.price : String(round2(price - unit * count)),
    ...(who.length ? { assignees: [...who] } : {}),
  };

  return [rest, ...singles];
}
