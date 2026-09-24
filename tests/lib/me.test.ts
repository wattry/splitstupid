import { describe, it, expect, vi } from 'vitest';
import {
  ME_STORAGE_KEY,
  ensureMe,
  isMe,
  loadMe,
  meAsFriend,
  meParticipant,
  newMe,
  saveMe,
  validateMeName,
} from '../../src/lib/me.js';
import type { Friend, Me, Participant } from '../../src/types.js';

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
