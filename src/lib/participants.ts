/**
 * Who is on the current bill. Participants are snapshots of friends
 * (`id` + `name` at the time of adding) so a shared link carries them
 * without the recipient knowing the sender's friends. Nothing here reads or
 * writes the friend store; `importParticipant` only builds the new list.
 */
import type { Friend, Participant } from '../types.js';
import { addFriend, normalizeName, type FriendResult } from './friends.js';

/**
 * Clean a list of participants: drop entries whose name is blank once
 * normalized, and keep only the first occurrence of each id. Names are
 * normalized (trimmed, whitespace-collapsed) and order is preserved. Shared
 * by share links and JSON imports so both sources of participants get the
 * same cleanup.
 */
export function dedupeParticipants(list: Participant[]): Participant[] {
  const seen = new Set<string>();
  const out: Participant[] = [];
  for (const { id, name } of list) {
    const clean = normalizeName(name);
    if (clean === '') continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: clean });
  }
  return out;
}

export function isParticipant(participants: Participant[], id: string): boolean {
  return participants.some((p) => p.id === id);
}

/** Add the friend to the bill, or take them off if already on it. */
export function toggleParticipant(participants: Participant[], friend: Friend): Participant[] {
  return isParticipant(participants, friend.id)
    ? removeParticipant(participants, friend.id)
    : [...participants, { id: friend.id, name: friend.name }];
}

export function removeParticipant(participants: Participant[], id: string): Participant[] {
  return participants.filter((p) => p.id !== id);
}

/** After a friend is renamed locally, keep this bill's snapshot in step. */
export function syncRename(participants: Participant[], id: string, name: string): Participant[] {
  return participants.map((p) => (p.id === id ? { ...p, name } : p));
}

/**
 * Copy a participant from a received bill into the friend list, keeping its
 * id so future links from either side line up. `name` overrides the snapshot
 * name (used when it collides with an existing friend).
 */
export function importParticipant(
  friends: Friend[],
  participant: Participant,
  name?: string
): FriendResult {
  return addFriend(friends, name ?? participant.name, participant.id);
}
