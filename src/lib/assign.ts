/**
 * Item assignment: which bill participants had a row. Pure helpers over
 * `Item.assignees` (participant ids). Labelling only; nothing here touches
 * Yours or the owed maths.
 */
import type { Item, Participant } from '../types.js';
import { round2 } from './calculate.js';

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

/** Full amount of a row, independent of `Yours`. */
export function lineTotal(item: Item, perUnit: boolean): number {
  const price = parseFloat(item.price) || 0;
  if (!perUnit) return price;
  const units = parseFloat(item.units) || 0;
  return price * units;
}

export interface PersonLine { item: Item; share: number; sharedWith: number }
export interface PersonGroup { participant: Participant; lines: PersonLine[]; total: number }
export interface Grouping { groups: PersonGroup[]; unassigned: PersonLine[]; unassignedTotal: number; total: number }

/** `2× Beer` when the row lands wholly on one person and has integer units > 1; else just the description. */
export function lineLabel(line: PersonLine): string {
  const desc = line.item.desc.trim() || 'item';
  const units = Number(line.item.units);
  if (line.sharedWith === 1 && Number.isInteger(units) && units > 1) return `${units}× ${desc}`;
  return desc;
}

/** Items under each participant (bill order, empty groups omitted) plus the unassigned rest. */
export function groupByParticipant(items: Item[], participants: Participant[], perUnit: boolean): Grouping {
  const onBill = new Set(participants.map((p) => p.id));
  const groups = participants
    .map((participant) => {
      const lines = items
        .filter((it) => assigneesOf(it).includes(participant.id))
        .map((item) => {
          const onBillAssignees = assigneesOf(item).filter((id) => onBill.has(id));
          const share = round2(lineTotal(item, perUnit) / onBillAssignees.length);
          return { item, share, sharedWith: onBillAssignees.length };
        });
      const total = round2(lines.reduce((sum, l) => sum + l.share, 0));
      return { participant, lines, total };
    })
    .filter((g) => g.lines.length > 0);
  const unassigned = items
    .filter((it) => !assigneesOf(it).some((id) => onBill.has(id)))
    .map((item) => ({ item, share: round2(lineTotal(item, perUnit)), sharedWith: 1 }));
  const unassignedTotal = round2(unassigned.reduce((sum, l) => sum + l.share, 0));
  const total = round2(groups.reduce((sum, g) => sum + g.total, 0) + unassignedTotal);
  return { groups, unassigned, unassignedTotal, total };
}
