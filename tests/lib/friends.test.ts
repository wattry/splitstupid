import { describe, it, expect, vi } from 'vitest';
import {
  FRIENDS_STORAGE_KEY,
  addFriend,
  filterFriends,
  findByName,
  loadFriends,
  nameKey,
  normalizeName,
  removeFriend,
  renameFriend,
  saveFriends,
} from '../../src/lib/friends.js';
import type { Friend } from '../../src/types.js';

const sam: Friend = { id: 'id-sam', name: 'Sam' };
const alex: Friend = { id: 'id-alex', name: 'Alex Kim' };
const list: Friend[] = [sam, alex];

describe('normalizeName / nameKey', () => {
  it('trims and collapses inner whitespace', () => {
    expect(normalizeName('  Alex   Kim ')).toBe('Alex Kim');
  });

  it('keys are case-insensitive', () => {
    expect(nameKey(' ALEX  kim')).toBe('alex kim');
  });
});

describe('findByName', () => {
  it('matches ignoring case and whitespace', () => {
    expect(findByName(list, ' alex   KIM ')).toBe(alex);
  });

  it('returns undefined when nobody matches', () => {
    expect(findByName(list, 'Jo')).toBeUndefined();
  });
});

describe('addFriend', () => {
  it('appends a friend with the normalized name and a fresh id', () => {
    const result = addFriend(list, '  Jo  Bloggs ');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.friend.name).toBe('Jo Bloggs');
    expect(result.friend.id).toMatch(/[0-9a-f-]{36}/);
    expect(result.friends).toEqual([...list, result.friend]);
  });

  it('uses the given id when one is supplied', () => {
    const result = addFriend(list, 'Jo', 'given-id');
    expect(result.ok && result.friend.id).toBe('given-id');
  });

  it('rejects a blank name', () => {
    expect(addFriend(list, '   ')).toEqual({ ok: false, error: 'empty' });
  });

  it('rejects a duplicate name ignoring case and whitespace, naming the existing friend', () => {
    expect(addFriend(list, ' sam ')).toEqual({ ok: false, error: 'duplicate', existing: sam });
  });

  it('does not mutate the input list', () => {
    const before = [...list];
    addFriend(list, 'Jo');
    expect(list).toEqual(before);
  });
});

describe('renameFriend', () => {
  it('renames in place, normalized', () => {
    const result = renameFriend(list, 'id-sam', ' Sam  K ');
    expect(result.ok && result.friends).toEqual([{ id: 'id-sam', name: 'Sam K' }, alex]);
  });

  it('allows renaming a friend to a different casing of their own name', () => {
    const result = renameFriend(list, 'id-sam', 'SAM');
    expect(result.ok && result.friends[0]).toEqual({ id: 'id-sam', name: 'SAM' });
  });

  it('rejects a name another friend already has', () => {
    expect(renameFriend(list, 'id-sam', 'alex kim')).toEqual({
      ok: false,
      error: 'duplicate',
      existing: alex,
    });
  });

  it('rejects a blank name', () => {
    expect(renameFriend(list, 'id-sam', '')).toEqual({ ok: false, error: 'empty' });
  });

  it('is a no-op success for an unknown id', () => {
    const result = renameFriend(list, 'nope', 'Zed');
    expect(result).toEqual({ ok: true, friends: list, friend: { id: 'nope', name: 'Zed' } });
  });
});

describe('removeFriend', () => {
  it('removes by id and leaves others alone', () => {
    expect(removeFriend(list, 'id-sam')).toEqual([alex]);
  });

  it('returns an equal list for an unknown id', () => {
    expect(removeFriend(list, 'nope')).toEqual(list);
  });
});

describe('filterFriends', () => {
  const many: Friend[] = [
    { id: '1', name: 'zed' },
    { id: '2', name: 'Alex Kim' },
    { id: '3', name: 'alexa' },
    { id: '4', name: 'Sam' },
  ];

  it('sorts by name, case-insensitively, when the query is empty', () => {
    expect(filterFriends(many, '').map((f) => f.name)).toEqual(['Alex Kim', 'alexa', 'Sam', 'zed']);
  });

  it('keeps case-insensitive substring matches anywhere in the name', () => {
    expect(filterFriends(many, 'KIM').map((f) => f.name)).toEqual(['Alex Kim']);
    expect(filterFriends(many, 'alex').map((f) => f.name)).toEqual(['Alex Kim', 'alexa']);
  });

  it('ignores surrounding whitespace in the query', () => {
    expect(filterFriends(many, '  sam ').map((f) => f.name)).toEqual(['Sam']);
  });
});

describe('loadFriends', () => {
  const storageWith = (value: string | null) => ({ getItem: () => value });

  it('reads a valid store', () => {
    const raw = JSON.stringify({ v: 1, friends: list });
    expect(loadFriends(storageWith(raw))).toEqual(list);
  });

  it('reads from the fixed key', () => {
    const getItem = vi.fn(() => null);
    loadFriends({ getItem });
    expect(getItem).toHaveBeenCalledWith(FRIENDS_STORAGE_KEY);
  });

  it('returns [] when the key is missing', () => {
    expect(loadFriends(storageWith(null))).toEqual([]);
  });

  it('returns [] for garbage JSON', () => {
    expect(loadFriends(storageWith('{nope'))).toEqual([]);
  });

  it('returns [] for the wrong version', () => {
    expect(loadFriends(storageWith(JSON.stringify({ v: 2, friends: list })))).toEqual([]);
  });

  it('returns [] when any entry is malformed', () => {
    const raw = JSON.stringify({ v: 1, friends: [sam, { id: 3, name: 'x' }] });
    expect(loadFriends(storageWith(raw))).toEqual([]);
  });

  it('returns [] when storage access throws', () => {
    const storage = { getItem: () => { throw new Error('blocked'); } };
    expect(loadFriends(storage)).toEqual([]);
  });
});

describe('saveFriends', () => {
  it('writes the versioned envelope under the fixed key', () => {
    const setItem = vi.fn();
    saveFriends({ setItem }, list);
    expect(setItem).toHaveBeenCalledWith(FRIENDS_STORAGE_KEY, JSON.stringify({ v: 1, friends: list }));
  });

  it('swallows storage errors', () => {
    const storage = { setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(() => saveFriends(storage, list)).not.toThrow();
  });
});
