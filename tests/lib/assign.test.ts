import { describe, it, expect } from 'vitest';
import {
  assigneesOf, assignAll, assigneeStatus, groupByParticipant, lineLabel, lineTotal, pruneAssignees, setAssignees, setAssigneesAll, shortLabels, stripAssignee, toggleAssignee, toggleAssigneeAll,
} from '../../src/lib/assign.js';
import type { Item, Participant } from '../../src/types.js';

const item = (fields: Partial<Item> = {}): Item =>
  ({ id: 'i1', units: '1', yours: '1', desc: 'Soup', price: '5', ...fields });
const me: Participant = { id: 'me', name: 'Ryan Wattrus' };
const sam: Participant = { id: 'sam', name: 'Sam' };
const sk: Participant = { id: 'sk', name: 'Sam Kim' };
const people = [me, sam, sk];

describe('assigneesOf / toggleAssignee / setAssignees', () => {
  it('reads an absent list as empty', () => {
    expect(assigneesOf(item())).toEqual([]);
  });
  it('toggles on and off without mutating', () => {
    const base = item();
    const on = toggleAssignee(base, 'sam');
    expect(on.assignees).toEqual(['sam']);
    expect(base.assignees).toBeUndefined();
    expect(toggleAssignee(on, 'sam').assignees).toBeUndefined();
  });
  it('setAssignees dedupes and keeps order', () => {
    expect(setAssignees(item(), ['sam', 'me', 'sam']).assignees).toEqual(['sam', 'me']);
  });
});

describe('setAssignees with meId', () => {
  it('adding Me bumps yours toward units', () => {
    const base = item({ units: '2', yours: '0' });
    const out = setAssignees(base, ['me'], 'me');
    expect(out.yours).toBe('1');
  });
  it('adding Me again with no membership change leaves yours alone', () => {
    const base = item({ units: '2', yours: '1', assignees: ['me'] });
    const out = setAssignees(base, ['me'], 'me');
    expect(out.yours).toBe('1');
  });
  it('removing Me decrements yours', () => {
    const base = item({ units: '2', yours: '1', assignees: ['me'] });
    const out = setAssignees(base, [], 'me');
    expect(out.yours).toBe('0');
  });
  it('caps yours at units when adding Me', () => {
    const base = item({ units: '1', yours: '1' });
    const out = setAssignees(base, ['me'], 'me');
    expect(out.yours).toBe('1');
  });
  it('floors yours at 0 when removing Me', () => {
    const base = item({ units: '2', yours: '0', assignees: ['me'] });
    const out = setAssignees(base, [], 'me');
    expect(out.yours).toBe('0');
  });
  it('leaves yours untouched without a meId', () => {
    const base = item({ units: '2', yours: '0' });
    const out = setAssignees(base, ['me']);
    expect(out.yours).toBe('0');
  });
  it('blank units increments yours uncapped', () => {
    const base = item({ units: '', yours: '0' });
    const out = setAssignees(base, ['me'], 'me');
    expect(out.yours).toBe('1');
  });
  it('adding Me to a non-integer yours rounds to cents', () => {
    const base = item({ units: '2', yours: '0.5' });
    const out = setAssignees(base, ['me'], 'me');
    expect(out.yours).toBe('1.5');
  });
});

describe('toggleAssignee / assignAll / toggleAssigneeAll / setAssigneesAll thread meId', () => {
  it('toggleAssignee moves Mine when toggling Me on', () => {
    const base = item({ units: '2', yours: '0' });
    expect(toggleAssignee(base, 'me', 'me').yours).toBe('1');
  });
  it('assignAll moves Mine when assigning Me to listed rows', () => {
    const a = item({ id: 'a', units: '2', yours: '0' });
    const out = assignAll([a], new Set(['a']), 'me', 'me');
    expect(out[0]!.yours).toBe('1');
  });
  it('toggleAssigneeAll moves Mine when adding Me to listed rows', () => {
    const a = item({ id: 'a', units: '2', yours: '0' });
    const out = toggleAssigneeAll([a], new Set(['a']), 'me', 'me');
    expect(out[0]!.yours).toBe('1');
  });
  it('setAssigneesAll moves Mine for a row gaining Me and leaves it alone when membership does not change', () => {
    const a = item({ id: 'a', units: '2', yours: '0' });
    const b = item({ id: 'b', assignees: ['sam'] });
    const c = item({ id: 'c', yours: '1', assignees: ['me'] });
    const out = setAssigneesAll([a, b, c], new Set(['a', 'c']), ['me'], 'me');
    expect(out[0]!.yours).toBe('1');
    expect(out[1]).toBe(b);
    expect(out[2]!.yours).toBe('1');
  });
  it('setAssigneesAll decrements Mine when Me is removed', () => {
    const c = item({ id: 'c', yours: '1', assignees: ['me'] });
    const out = setAssigneesAll([c], new Set(['c']), [], 'me');
    expect(out[0]!.yours).toBe('0');
  });
  it('setAssigneesAll preserves identity for untouched or unchanged rows', () => {
    const a = item({ id: 'a', units: '2', yours: '0' });
    const b = item({ id: 'b', assignees: ['sam'] });
    const c = item({ id: 'c', assignees: ['sam'] });
    const out = setAssigneesAll([a, b, c], new Set(['a', 'c']), ['sam'], 'me');
    expect(out[0]!.assignees).toEqual(['sam']);
    expect(out[0]!.yours).toBe('0');
    expect(out[1]).toBe(b);
    expect(out[2]).toBe(c);
  });
});

describe('stripAssignee / pruneAssignees', () => {
  it('removes an id from every row and leaves untouched rows identical', () => {
    const a = item({ id: 'a', yours: '1', assignees: ['sam', 'me'] });
    const b = item({ id: 'b' });
    const out = stripAssignee([a, b], 'sam');
    expect(out[0]!.assignees).toEqual(['me']);
    expect(out[0]!.yours).toBe('1');
    expect(out[1]).toBe(b);
  });
  it('prunes ids that are not on the bill', () => {
    const a = item({ yours: '1', assignees: ['sam', 'ghost'] });
    const out = pruneAssignees([a], [sam]);
    expect(out[0]!.assignees).toEqual(['sam']);
    expect(out[0]!.yours).toBe('1');
  });
});

describe('shortLabels', () => {
  it('uses first and last initials, one letter for one word, Me for blank', () => {
    const labels = shortLabels([me, sam, { id: 'x', name: '' }, { id: 'y', name: 'Mary Ann Lee' }]);
    expect(labels.get('me')).toBe('RW');
    expect(labels.get('sam')).toBe('S');
    expect(labels.get('x')).toBe('Me');
    expect(labels.get('y')).toBe('ML');
  });
  it('falls back to full names only for colliding labels', () => {
    const labels = shortLabels([sk, { id: 'sl', name: 'Sue Kerr' }, sam]);
    expect(labels.get('sk')).toBe('Sam Kim');
    expect(labels.get('sl')).toBe('Sue Kerr');
    expect(labels.get('sam')).toBe('S');
  });
});

describe('lineTotal', () => {
  it('total mode: price is the line total', () => {
    expect(lineTotal(item({ price: '10' }), false)).toBe(10);
  });
  it('per-unit mode: price × units', () => {
    expect(lineTotal(item({ price: '5', units: '3' }), true)).toBe(15);
  });
  it('NaN inputs count as 0', () => {
    expect(lineTotal(item({ price: 'x' }), false)).toBe(0);
    expect(lineTotal(item({ price: '5', units: 'x' }), true)).toBe(0);
  });
});

describe('groupByParticipant', () => {
  it('groups in participant order, omits empty groups, lists unassigned last', () => {
    const a = item({ id: 'a', assignees: ['sam', 'me'] });
    const b = item({ id: 'b', assignees: ['sam'] });
    const c = item({ id: 'c' });
    const g = groupByParticipant([a, b, c], people, false);
    expect(g.groups.map((x) => x.participant.id)).toEqual(['me', 'sam']);
    expect(g.groups[1]!.lines.map((l) => l.item.id)).toEqual(['a', 'b']);
    expect(g.unassigned.map((l) => l.item.id)).toEqual(['c']);
  });
  it('ignores ids that are not on the bill', () => {
    const g = groupByParticipant([item({ assignees: ['ghost'] })], people, false);
    expect(g.groups).toEqual([]);
    expect(g.unassigned).toHaveLength(1);
  });
  it('splits an item between two assignees evenly', () => {
    const a = item({ id: 'a', price: '10', assignees: ['sam', 'me'] });
    const g = groupByParticipant([a], people, false);
    const meGroup = g.groups.find((x) => x.participant.id === 'me')!;
    const samGroup = g.groups.find((x) => x.participant.id === 'sam')!;
    expect(meGroup.lines[0]!.share).toBe(5);
    expect(samGroup.lines[0]!.share).toBe(5);
    expect(meGroup.total).toBe(5);
    expect(samGroup.total).toBe(5);
  });
  it('splits an item between three assignees, rounding each share and summing the displayed shares', () => {
    const a = item({ id: 'a', price: '10', assignees: ['sam', 'me', 'sk'] });
    const g = groupByParticipant([a], people, false);
    for (const p of ['me', 'sam', 'sk']) {
      const grp = g.groups.find((x) => x.participant.id === p)!;
      expect(grp.lines[0]!.share).toBe(3.33);
      expect(grp.total).toBe(3.33);
    }
  });
  it('per-unit mode multiplies price by units before splitting', () => {
    const a = item({ id: 'a', price: '5', units: '2', assignees: ['sam', 'me'] });
    const g = groupByParticipant([a], people, true);
    const meGroup = g.groups.find((x) => x.participant.id === 'me')!;
    expect(meGroup.lines[0]!.share).toBe(5);
  });
  it('unassigned lines carry the full line total and sum', () => {
    const a = item({ id: 'a', price: '10' });
    const b = item({ id: 'b', price: '5' });
    const g = groupByParticipant([a, b], people, false);
    expect(g.unassigned.map((l) => l.share)).toEqual([10, 5]);
    expect(g.unassignedTotal).toBe(15);
  });
  it('total sums every group subtotal plus unassigned', () => {
    const a = item({ id: 'a', price: '10', assignees: ['sam', 'me'] });
    const b = item({ id: 'b', price: '7' });
    const g = groupByParticipant([a, b], people, false);
    expect(g.total).toBe(5 + 5 + 7);
  });
  it('sets sharedWith to the number of on-bill assignees, 1 for unassigned', () => {
    const a = item({ id: 'a', assignees: ['sam', 'me'] });
    const b = item({ id: 'b' });
    const g = groupByParticipant([a, b], people, false);
    const meGroup = g.groups.find((x) => x.participant.id === 'me')!;
    expect(meGroup.lines[0]!.sharedWith).toBe(2);
    expect(g.unassigned[0]!.sharedWith).toBe(1);
  });
});

describe('assignAll / toggleAssigneeAll / assigneeStatus', () => {
  it('assignAll adds the id to every listed row and skips rows already having it (identity kept)', () => {
    const a = item({ id: 'a' });
    const b = item({ id: 'b', assignees: ['sam'] });
    const c = item({ id: 'c' });
    const out = assignAll([a, b, c], new Set(['a', 'b']), 'sam');
    expect(out[0]!.assignees).toEqual(['sam']);
    expect(out[1]).toBe(b);
    expect(out[2]).toBe(c);
  });

  it('toggleAssigneeAll removes the id from all listed rows when every one has it', () => {
    const a = item({ id: 'a', assignees: ['sam'] });
    const b = item({ id: 'b', assignees: ['sam', 'me'] });
    const c = item({ id: 'c', assignees: ['sam'] });
    const out = toggleAssigneeAll([a, b, c], new Set(['a', 'b']), 'sam');
    expect(out[0]!.assignees).toBeUndefined();
    expect(out[1]!.assignees).toEqual(['me']);
    expect(out[2]).toBe(c);
  });

  it('toggleAssigneeAll adds the id to all listed rows when only some have it', () => {
    const a = item({ id: 'a', assignees: ['sam'] });
    const b = item({ id: 'b' });
    const out = toggleAssigneeAll([a, b], new Set(['a', 'b']), 'sam');
    expect(out[0]).toBe(a);
    expect(out[1]!.assignees).toEqual(['sam']);
  });

  it('assigneeStatus splits ids every row has from ids only some rows have', () => {
    const a = item({ id: 'a', assignees: ['sam', 'me'] });
    const b = item({ id: 'b', assignees: ['sam'] });
    const status = assigneeStatus([a, b], new Set(['a', 'b']));
    expect(status.all).toEqual(['sam']);
    expect(status.some).toEqual(['me']);
  });

  it('an empty selection gives empty arrays and untouched rows keep identity', () => {
    const a = item({ id: 'a', assignees: ['sam'] });
    expect(assigneeStatus([a], new Set())).toEqual({ all: [], some: [] });
    expect(assignAll([a], new Set(), 'sam')).toEqual([a]);
    expect(assignAll([a], new Set(), 'sam')[0]).toBe(a);
    expect(toggleAssigneeAll([a], new Set(), 'sam')[0]).toBe(a);
  });
});

describe('lineLabel', () => {
  it('shows the unit count for a sole line with integer units greater than 1', () => {
    expect(lineLabel({ item: item({ desc: 'Beer', units: '3' }), share: 0, sharedWith: 1 })).toBe('3× Beer');
  });
  it('omits the count for a shared line even with units greater than 1', () => {
    expect(lineLabel({ item: item({ desc: 'Beer', units: '3' }), share: 0, sharedWith: 2 })).toBe('Beer');
  });
  it('omits the count for a sole line with units of 1', () => {
    expect(lineLabel({ item: item({ desc: 'Beer', units: '1' }), share: 0, sharedWith: 1 })).toBe('Beer');
  });
  it('falls back to "item" for a blank description', () => {
    expect(lineLabel({ item: item({ desc: '  ' }), share: 0, sharedWith: 1 })).toBe('item');
  });
  it('omits the count for non-integer units', () => {
    expect(lineLabel({ item: item({ desc: 'Beer', units: '2.5' }), share: 0, sharedWith: 1 })).toBe('Beer');
  });
});
