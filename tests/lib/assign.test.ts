import { describe, it, expect } from 'vitest';
import {
  assigneesOf, groupByParticipant, pruneAssignees, setAssignees, shortLabels, stripAssignee, toggleAssignee,
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

describe('stripAssignee / pruneAssignees', () => {
  it('removes an id from every row and leaves untouched rows identical', () => {
    const a = item({ id: 'a', assignees: ['sam', 'me'] });
    const b = item({ id: 'b' });
    const out = stripAssignee([a, b], 'sam');
    expect(out[0]!.assignees).toEqual(['me']);
    expect(out[1]).toBe(b);
  });
  it('prunes ids that are not on the bill', () => {
    const a = item({ assignees: ['sam', 'ghost'] });
    expect(pruneAssignees([a], [sam])[0]!.assignees).toEqual(['sam']);
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

describe('groupByParticipant', () => {
  it('groups in participant order, omits empty groups, lists unassigned last', () => {
    const a = item({ id: 'a', assignees: ['sam', 'me'] });
    const b = item({ id: 'b', assignees: ['sam'] });
    const c = item({ id: 'c' });
    const g = groupByParticipant([a, b, c], people);
    expect(g.groups.map((x) => x.participant.id)).toEqual(['me', 'sam']);
    expect(g.groups[1]!.items.map((x) => x.id)).toEqual(['a', 'b']);
    expect(g.unassigned.map((x) => x.id)).toEqual(['c']);
  });
  it('ignores ids that are not on the bill', () => {
    const g = groupByParticipant([item({ assignees: ['ghost'] })], people);
    expect(g.groups).toEqual([]);
    expect(g.unassigned).toHaveLength(1);
  });
});
