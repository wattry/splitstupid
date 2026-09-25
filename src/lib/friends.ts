/**
 * The user's personal friend list: pure list operations plus the
 * localStorage envelope. Names must be unique within the list; uniqueness is
 * judged on `nameKey` (trimmed, whitespace-collapsed, lowercased). Identity
 * is the `id`, which is what travels in share links.
 */
import type { Friend } from '../types.js';

export const FRIENDS_STORAGE_KEY = 'splitstupid.friends.v1';

export type FriendError = 'empty' | 'duplicate';

export type FriendResult =
  { ok: true; friends: Friend[]; friend: Friend } |
  /** `existing` is the friend whose name collided (duplicate only). */
  { ok: false; error: FriendError; existing?: Friend };

/** Trim and collapse runs of whitespace to a single space. */
export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** The uniqueness key for a name. */
export function nameKey(name: string): string {
  return normalizeName(name).toLowerCase();
}

export function findByName(friends: Friend[], name: string): Friend | undefined {
  const key = nameKey(name);
  return friends.find((f) => nameKey(f.name) === key);
}

/** Validate a candidate name against the list, ignoring `selfId` if given. */
function checkName(friends: Friend[], name: string, selfId?: string): FriendResult | null {
  if (normalizeName(name) === '') return { ok: false, error: 'empty' };
  const existing = findByName(friends, name);
  if (existing && existing.id !== selfId) return { ok: false, error: 'duplicate', existing };
  return null;
}

/** Append a friend. `id` is for importing a participant that already has one. */
export function addFriend(friends: Friend[], name: string, id?: string): FriendResult {
  const problem = checkName(friends, name);
  if (problem) return problem;
  const friend: Friend = { id: id ?? crypto.randomUUID(), name: normalizeName(name) };
  return { ok: true, friends: [...friends, friend], friend };
}

/** Rename by id. An unknown id is a no-op success. */
export function renameFriend(friends: Friend[], id: string, name: string): FriendResult {
  const problem = checkName(friends, name, id);
  if (problem) return problem;
  const clean = normalizeName(name);
  const friend: Friend = { id, name: clean };
  if (!friends.some((f) => f.id === id)) return { ok: true, friends, friend };
  return { ok: true, friends: friends.map((f) => (f.id === id ? friend : f)), friend };
}

export function removeFriend(friends: Friend[], id: string): Friend[] {
  return friends.filter((f) => f.id !== id);
}

/** Case-insensitive substring filter, sorted by name. */
export function filterFriends(friends: Friend[], query: string): Friend[] {
  const q = nameKey(query);
  return friends
    .filter((f) => q === '' || nameKey(f.name).includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

function isFriend(value: unknown): value is Friend {
  if (typeof value !== 'object' || value === null) return false;
  const { id, name } = value as Record<string, unknown>;
  return typeof id === 'string' && typeof name === 'string';
}

/** Read the list; anything missing or malformed reads as an empty list. */
export function loadFriends(storage: Pick<Storage, 'getItem'>): Friend[] {
  try {
    const raw = storage.getItem(FRIENDS_STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return [];
    const { v, friends } = data as Record<string, unknown>;
    if (v !== 1 || !Array.isArray(friends) || !friends.every(isFriend)) return [];
    return friends;
  } catch {
    return [];
  }
}

/** Write the list. Quota and access errors are swallowed: memory still works. */
export function saveFriends(storage: Pick<Storage, 'setItem'>, friends: Friend[]): void {
  try {
    storage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify({ v: 1, friends }));
  } catch {
    // Storage full or blocked; the in-memory list still serves this session.
  }
}
