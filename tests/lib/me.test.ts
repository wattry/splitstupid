import { describe, it, expect, vi } from 'vitest';
import {
  ME_STORAGE_KEY,
  adoptIdentity,
  ensureMe,
  isMe,
  loadMe,
  meAsFriend,
  meParticipant,
  newMe,
  saveMe,
  validateMeName,
} from '../../src/lib/me.js';
import type { Friend, Item, Me, Participant } from '../../src/types.js';

const me: Me = { id: 'id-me', name: 'Ryan' };
const sam: Friend = { id: 'id-sam', name: 'Sam' };

describe('newMe', () => {
  it('has a fresh uuid and a blank name', () => {
    const a = newMe();
    const b = newMe();
    expect(a.name).toBe('');
    expect(a.id).toMatch(/[0-9a-f-]{36}/);
    expect(a.id).not.toBe(b.id);
  });
});

describe('loadMe / saveMe', () => {
  const storageWith = (value: string | null) => ({ getItem: () => value });

  it('reads a valid envelope', () => {
    expect(loadMe(storageWith(JSON.stringify({ v: 1, id: 'id-me', name: 'Ryan' })))).toEqual(me);
  });

  it('reads from the fixed key', () => {
    const getItem = vi.fn(() => null);
    loadMe({ getItem });
    expect(getItem).toHaveBeenCalledWith(ME_STORAGE_KEY);
  });

  it('returns null for missing, garbage, wrong version, bad fields or throwing storage', () => {
    expect(loadMe(storageWith(null))).toBeNull();
    expect(loadMe(storageWith('{nope'))).toBeNull();
    expect(loadMe(storageWith(JSON.stringify({ v: 2, id: 'x', name: 'y' })))).toBeNull();
    expect(loadMe(storageWith(JSON.stringify({ v: 1, id: 3, name: 'y' })))).toBeNull();
    expect(loadMe({ getItem: () => { throw new Error('blocked'); } })).toBeNull();
  });

  it('writes the envelope and swallows errors', () => {
    const setItem = vi.fn();
    saveMe({ setItem }, me);
    expect(setItem).toHaveBeenCalledWith(ME_STORAGE_KEY, JSON.stringify({ v: 1, id: 'id-me', name: 'Ryan' }));
    expect(() => saveMe({ setItem: () => { throw new Error('full'); } }, me)).not.toThrow();
  });
});

describe('isMe / meParticipant / meAsFriend', () => {
  it('matches by id', () => {
    expect(isMe(me, 'id-me')).toBe(true);
    expect(isMe(me, 'id-sam')).toBe(false);
  });

  it('snapshots me as a participant', () => {
    expect(meParticipant(me)).toEqual({ id: 'id-me', name: 'Ryan' });
  });

  it('presents a blank me as "Me" for error copy', () => {
    expect(meAsFriend({ id: 'id-me', name: '' })).toEqual({ id: 'id-me', name: 'Me' });
    expect(meAsFriend(me)).toEqual({ id: 'id-me', name: 'Ryan' });
  });
});

describe('ensureMe', () => {
  const others: Participant[] = [{ id: 'id-sam', name: 'Sam' }];

  it('prepends me when absent', () => {
    expect(ensureMe(others, me)).toEqual([{ id: 'id-me', name: 'Ryan' }, ...others]);
  });

  it('leaves the list alone when me is present anywhere', () => {
    const list = [...others, { id: 'id-me', name: 'Old name' }];
    expect(ensureMe(list, me)).toBe(list);
  });

  it('seeds an empty list', () => {
    expect(ensureMe([], me)).toEqual([{ id: 'id-me', name: 'Ryan' }]);
  });
});

describe('validateMeName', () => {
  it('accepts a new normalized name', () => {
    const result = validateMeName([sam], '  Ryan  W ');
    expect(result.ok && result.friend.name).toBe('Ryan W');
  });

  it('rejects blank', () => {
    expect(validateMeName([sam], '  ')).toEqual({ ok: false, error: 'empty' });
  });

  it('rejects a friend name, case-insensitively', () => {
    expect(validateMeName([sam], 'sam')).toEqual({ ok: false, error: 'duplicate', existing: sam });
  });
});

describe('adoptIdentity', () => {
  const oldMe: Me = { id: 'id-old', name: '' };
  const ryan: Participant = { id: 'id-r', name: 'Ryan' };
  const sam: Friend = { id: 'id-sam', name: 'Sam' };
  const row = (id: string, assignees?: string[]): Item =>
    ({ id, units: '1', yours: '1', desc: id, price: '1', ...(assignees ? { assignees } : {}) });

  it('adopts the target id and name, remaps rows, reorders participants, drops the friend', () => {
    const out = adoptIdentity({
      me: oldMe,
      friends: [sam, { id: 'id-r', name: 'Ryan' }],
      participants: [{ id: 'id-old', name: '' }, { id: 'id-sam', name: 'Sam' }, ryan],
      items: [row('a', ['id-old']), row('b', ['id-r', 'id-old']), row('c', ['id-sam']), row('d')],
      target: ryan,
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.me).toEqual({ id: 'id-r', name: 'Ryan' });
    expect(out.participants).toEqual([ryan, { id: 'id-sam', name: 'Sam' }]);
    expect(out.friends).toEqual([sam]);
    expect(out.items.map((it) => it.assignees)).toEqual([['id-r'], ['id-r'], ['id-sam'], undefined]);
  });

  it('leaves rows that do not mention the old id identical', () => {
    const c = row('c', ['id-sam']);
    const out = adoptIdentity({ me: oldMe, friends: [], participants: [ryan], items: [c], target: ryan });
    expect(out.ok && out.items[0]).toBe(c);
  });

  it('refuses when the target name collides with another friend', () => {
    const out = adoptIdentity({
      me: oldMe,
      friends: [{ id: 'id-other', name: 'ryan' }],
      participants: [{ id: 'id-old', name: '' }, ryan],
      items: [],
      target: ryan,
    });
    expect(out).toEqual({ ok: false, error: 'duplicate', existing: { id: 'id-other', name: 'ryan' } });
  });

  it('does not treat the target itself as a collision', () => {
    const out = adoptIdentity({ me: oldMe, friends: [{ id: 'id-r', name: 'Ryan' }], participants: [ryan], items: [], target: ryan });
    expect(out.ok).toBe(true);
  });
});
