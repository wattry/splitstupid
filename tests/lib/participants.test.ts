import { describe, it, expect } from 'vitest';
import {
  dedupeParticipants,
  importParticipant,
  isParticipant,
  removeParticipant,
  syncRename,
  toggleParticipant,
} from '../../src/lib/participants.js';
import type { Friend, Participant } from '../../src/types.js';

const sam: Friend = { id: 'id-sam', name: 'Sam' };
const alex: Friend = { id: 'id-alex', name: 'Alex' };
const onBill: Participant[] = [{ id: 'id-sam', name: 'Sam' }];

describe('toggleParticipant', () => {
  it('adds a snapshot of the friend when absent', () => {
    expect(toggleParticipant(onBill, alex)).toEqual([...onBill, { id: 'id-alex', name: 'Alex' }]);
  });

  it('removes the participant when present', () => {
    expect(toggleParticipant(onBill, sam)).toEqual([]);
  });

  it('does not mutate the input', () => {
    const before = [...onBill];
    toggleParticipant(onBill, alex);
    expect(onBill).toEqual(before);
  });
});

describe('removeParticipant / isParticipant', () => {
  it('removes by id', () => {
    expect(removeParticipant(onBill, 'id-sam')).toEqual([]);
    expect(removeParticipant(onBill, 'nope')).toEqual(onBill);
  });

  it('reports membership by id', () => {
    expect(isParticipant(onBill, 'id-sam')).toBe(true);
    expect(isParticipant(onBill, 'id-alex')).toBe(false);
  });
});

describe('syncRename', () => {
  it('renames the matching participant only', () => {
    const two = [...onBill, { id: 'id-alex', name: 'Alex' }];
    expect(syncRename(two, 'id-sam', 'Sam K')).toEqual([
      { id: 'id-sam', name: 'Sam K' },
      { id: 'id-alex', name: 'Alex' },
    ]);
  });

  it('leaves the list alone for an unknown id', () => {
    expect(syncRename(onBill, 'nope', 'Zed')).toEqual(onBill);
  });
});

describe('importParticipant', () => {
  const incoming: Participant = { id: 'id-jo', name: 'Jo' };

  it('adds the participant as a friend keeping its id and name', () => {
    const result = importParticipant([sam], incoming);
    expect(result.ok && result.friend).toEqual({ id: 'id-jo', name: 'Jo' });
    expect(result.ok && result.friends).toEqual([sam, { id: 'id-jo', name: 'Jo' }]);
  });

  it('uses the override name when given, still keeping the id', () => {
    const result = importParticipant([sam], incoming, ' Jo  B ');
    expect(result.ok && result.friend).toEqual({ id: 'id-jo', name: 'Jo B' });
  });

  it('reports a duplicate when the name collides', () => {
    const result = importParticipant([sam], { id: 'id-other', name: 'sam' });
    expect(result).toEqual({ ok: false, error: 'duplicate', existing: sam });
  });
});

describe('dedupeParticipants', () => {
  it('drops entries with a blank name', () => {
    expect(dedupeParticipants([{ id: 'id-sam', name: 'Sam' }, { id: 'id-blank', name: '   ' }])).toEqual([
      { id: 'id-sam', name: 'Sam' },
    ]);
  });

  it('keeps the first occurrence of a duplicate id', () => {
    expect(
      dedupeParticipants([{ id: 'id-sam', name: 'Sam' }, { id: 'id-sam', name: 'Sammy' }])
    ).toEqual([{ id: 'id-sam', name: 'Sam' }]);
  });

  it('preserves order', () => {
    const list: Participant[] = [
      { id: 'id-jo', name: 'Jo' },
      { id: 'id-sam', name: 'Sam' },
      { id: 'id-alex', name: 'Alex' },
    ];
    expect(dedupeParticipants(list)).toEqual(list);
  });

  it('stores normalized names', () => {
    expect(dedupeParticipants([{ id: 'a', name: '  Sam   Kim ' }])).toEqual([{ id: 'a', name: 'Sam Kim' }]);
  });
});
