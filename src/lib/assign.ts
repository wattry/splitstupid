/**
 * Item assignment: which bill participants had a row. Pure helpers over
 * `Item.assignees` (participant ids). Labelling only; nothing here touches
 * Yours or the owed maths.
 */
import type { Item, Participant } from '../types.js';

export function assigneesOf(item: Item): string[] {
  return item.assignees ?? [];
}

const unique = (ids: string[]): string[] => [...new Set(ids)];

export function setAssignees(item: Item, ids: string[]): Item {
  const deduped = unique(ids);
  if (deduped.length === 0) {
    const rest = { ...item };
    delete rest.assignees;
    return rest;
  }
  return { ...item, assignees: deduped };
}

export function toggleAssignee(item: Item, id: string): Item {
  const cur = assigneesOf(item);
  return setAssignees(item, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
}

/** Remove `id` from every row; rows that never had it are returned as-is. */
export function stripAssignee(items: Item[], id: string): Item[] {
  return items.map((it) => {
    const ids = assigneesOf(it);
    return ids.includes(id) ? setAssignees(it, ids.filter((x) => x !== id)) : it;
  });
}

/** Drop assignee ids that are not on the bill (after a link or file load). */
export function pruneAssignees(items: Item[], participants: Participant[]): Item[] {
  const onBill = new Set(participants.map((p) => p.id));
  return items.map((it) => {
    const ids = assigneesOf(it);
    const kept = ids.filter((x) => onBill.has(x));
    return kept.length === ids.length ? it : setAssignees(it, kept);
  });
}

const initials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Me';
  const first = words[0]![0]!;
  const last = words.length > 1 ? words[words.length - 1]![0]! : '';
  return (first + last).toUpperCase();
};

/** Short label per participant id: initials, or the full name when initials collide. */
export function shortLabels(participants: Participant[]): Map<string, string> {
  const raw = participants.map((p) => ({ id: p.id, name: p.name || 'Me', label: initials(p.name) }));
  const count = new Map<string, number>();
  for (const r of raw) count.set(r.label, (count.get(r.label) ?? 0) + 1);
  return new Map(raw.map((r) => [r.id, (count.get(r.label) ?? 0) > 1 ? r.name : r.label]));
}

export interface PersonGroup { participant: Participant; items: Item[] }
export interface Grouping { groups: PersonGroup[]; unassigned: Item[] }

/** Items under each participant (bill order, empty groups omitted) plus the unassigned rest. */
export function groupByParticipant(items: Item[], participants: Participant[]): Grouping {
  const onBill = new Set(participants.map((p) => p.id));
  const groups = participants
    .map((participant) => ({ participant, items: items.filter((it) => assigneesOf(it).includes(participant.id)) }))
    .filter((g) => g.items.length > 0);
  const unassigned = items.filter((it) => !assigneesOf(it).some((id) => onBill.has(id)));
  return { groups, unassigned };
}
