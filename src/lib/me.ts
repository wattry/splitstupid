/**
 * "Me": the device owner's identity. Persisted separately from the friend
 * list so it survives friend edits, and always present on every bill. The
 * name may be blank until the user is asked for it (sharing requires it).
 */
import type { Friend, Me, Participant } from '../types.js';
import { findByName, normalizeName, type FriendResult } from './friends.js';

export const ME_STORAGE_KEY = 'splitstupid.me.v1';

export function newMe(): Me {
  return { id: crypto.randomUUID(), name: '' };
}

/** Read the stored identity; null when missing or malformed. */
export function loadMe(storage: Pick<Storage, 'getItem'>): Me | null {
  try {
    const raw = storage.getItem(ME_STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    const { v, id, name } = data as Record<string, unknown>;
    if (v !== 1 || typeof id !== 'string' || typeof name !== 'string') return null;
    return { id, name };
  } catch {
    return null;
  }
}

export function saveMe(storage: Pick<Storage, 'setItem'>, me: Me): void {
  try {
    storage.setItem(ME_STORAGE_KEY, JSON.stringify({ v: 1, id: me.id, name: me.name }));
  } catch {
    // Storage full or blocked; the in-memory identity still serves this session.
  }
}

export function isMe(me: Me, id: string): boolean {
  return me.id === id;
}

export function meParticipant(me: Me): Participant {
  return { id: me.id, name: me.name };
}

/** Me shaped like a friend, with "Me" standing in for a blank name (error copy). */
export function meAsFriend(me: Me): Friend {
  return { id: me.id, name: me.name || 'Me' };
}

/** Make sure Me is on the bill; prepends when absent, otherwise returns the same list. */
export function ensureMe(participants: Participant[], me: Me): Participant[] {
  return participants.some((p) => p.id === me.id) ? participants : [meParticipant(me), ...participants];
}

/** Validate a name for Me against the friend list (blank / duplicate). */
export function validateMeName(friends: Friend[], name: string): FriendResult {
  const clean = normalizeName(name);
  if (clean === '') return { ok: false, error: 'empty' };
  const existing = findByName(friends, clean);
  if (existing) return { ok: false, error: 'duplicate', existing };
  return { ok: true, friends, friend: { id: '', name: clean } };
}
