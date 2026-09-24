import { describe, it, expect } from 'vitest';
import { splitItem, canSplit, maxSplit } from '../../src/lib/splitItem.js';
import type { Item, ItemFields } from '../../src/types.js';

let seq = 0;
const makeRow = (fields: ItemFields = {}): Item => {
  const row: Item = { id: `r${++seq}`, units: '1', yours: '1', desc: '', price: '', ...fields };
  if (fields.yours === undefined) row.yours = row.units;
  return row;
};

const item = (fields: Partial<Item>): Item =>
  ({ id: 'orig', units: '3', yours: '3', desc: 'Beer', price: '10.00', ...fields });

const sum = (rows: Item[]) => rows.reduce((t, r) => t + parseFloat(r.price), 0);

describe('canSplit / maxSplit', () => {
  it('only rows with an integer unit count of 2 or more can split', () => {
    expect(canSplit(item({ units: '3' }))).toBe(true);
    expect(canSplit(item({ units: '2' }))).toBe(true);
    expect(canSplit(item({ units: '1' }))).toBe(false);
    expect(canSplit(item({ units: '2.5' }))).toBe(false);
    expect(canSplit(item({ units: '' }))).toBe(false);
  });

  it('maxSplit is the unit count', () => {
    expect(maxSplit(item({ units: '4' }))).toBe(4);
  });
});

describe('splitItem — per-unit price', () => {
  it('splits out single rows with the same price and shrinks the original', () => {
    const rows = splitItem(item({ units: '3', price: '4.00' }), 2, true, makeRow);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ id: 'orig', units: '1', price: '4.00', desc: 'Beer' });
    expect(rows[1]).toMatchObject({ units: '1', yours: '1', price: '4.00', desc: 'Beer' });
    expect(rows[2]).toMatchObject({ units: '1', yours: '1', price: '4.00', desc: 'Beer' });
    expect(new Set(rows.map((r) => r.id)).size).toBe(3);
  });

  it('drops the original when every unit is split out', () => {
    const rows = splitItem(item({ units: '2', price: '4.00' }), 2, true, makeRow);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.id !== 'orig')).toBe(true);
    expect(rows.every((r) => r.units === '1' && r.price === '4.00')).toBe(true);
  });
});

describe('splitItem — total price', () => {
  it('gives each single row a unit share and keeps the sum equal to the original', () => {
    const rows = splitItem(item({ units: '3', price: '10.00' }), 2, false, makeRow);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ id: 'orig', units: '1' });
    expect(rows[1]?.price).toBe('3.33');
    expect(rows[2]?.price).toBe('3.33');
    expect(rows[0]?.price).toBe('3.34');
    expect(sum(rows)).toBeCloseTo(10, 2);
  });

  it('keeps the total for the remaining units on the original', () => {
    const rows = splitItem(item({ units: '4', price: '10.00' }), 1, false, makeRow);
    expect(rows[0]).toMatchObject({ id: 'orig', units: '3', price: '7.5' });
    expect(rows[1]).toMatchObject({ units: '1', price: '2.5' });
  });

  it('last single row absorbs rounding when every unit is split out', () => {
    const rows = splitItem(item({ units: '3', price: '10.00' }), 3, false, makeRow);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.id !== 'orig')).toBe(true);
    expect(rows.map((r) => r.price)).toEqual(['3.33', '3.33', '3.34']);
  });
});

describe('splitItem — yours', () => {
  it('singles are yours; the original keeps at most its remaining units', () => {
    const rows = splitItem(item({ units: '3', yours: '3', price: '9.00' }), 1, false, makeRow);
    expect(rows[0]?.yours).toBe('2');
    expect(rows[1]?.yours).toBe('1');
  });

  it('original keeps a smaller yours untouched when it still fits', () => {
    const rows = splitItem(item({ units: '3', yours: '1', price: '9.00' }), 1, false, makeRow);
    expect(rows[0]?.yours).toBe('1');
  });
});

describe('splitItem — invalid input', () => {
  it('returns the row unchanged when count is out of range or the row cannot split', () => {
    const it3 = item({ units: '3' });
    expect(splitItem(it3, 0, false, makeRow)).toEqual([it3]);
    expect(splitItem(it3, 4, false, makeRow)).toEqual([it3]);
    expect(splitItem(it3, 1.5, false, makeRow)).toEqual([it3]);
    const it1 = item({ units: '1' });
    expect(splitItem(it1, 1, false, makeRow)).toEqual([it1]);
  });
});
