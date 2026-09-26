/**
 * Item assignment: which bill participants had a row. Pure helpers over
 * `Item.assignees` (participant ids). When `meId` is passed, `Mine` follows
 * the assignment: units split evenly across everyone on the row.
 */
import type { Fee, Item, Participant } from '../types.js';
import { round2 } from './calculate.js';

export function assigneesOf(item: Item): string[] {
  return item.assignees ?? [];
}

const unique = (ids: string[]): string[] => [...new Set(ids)];

/** Integral values write back as a plain integer string; everything else rounds to cents. */
const formatAmount = (n: number): string => (Number.isInteger(n) ? String(n) : String(round2(n)));

/**
 * Replace a row's assignees. When `meId` is given, `Mine` is derived from the
 * result: if Me is on the row it becomes `units / assignees` (units blank
 * counts as 1), rounded to cents; if Me just left the row it becomes 0; rows
 * Me was never on keep whatever was typed.
 */
export function setAssignees(item: Item, ids: string[], meId?: string, onBill?: ReadonlySet<string>): Item {
  const deduped = unique(ids);
  let next: Item;
  if (deduped.length === 0) {
    next = { ...item };
    delete next.assignees;
  } else {
    next = { ...item, assignees: deduped };
  }
  if (meId === undefined) return next;
  const had = assigneesOf(item).includes(meId);
  const has = deduped.includes(meId);
  if (!had && !has) return next;
  // Only people on the bill count toward the split; a stale id from an old link must not dilute it.
  const sharers = onBill ? deduped.filter((id) => onBill.has(id) || id === meId).length : deduped.length;
  return { ...next, yours: formatAmount(has ? mineShare(item.units, sharers) : 0) };
}

/** Your share of a row's units when split evenly between `count` assignees. */
export function mineShare(units: string, count: number): number {
  const unitsNum = parseFloat(units);
  const base = Number.isFinite(unitsNum) && unitsNum > 0 ? unitsNum : 1;
  return count > 0 ? base / count : 0;
}

/**
 * Recompute `Mine` from assignments alone: on every row with someone on the
 * bill assigned, `yours` is Me's even share if Me is on it, else 0. Rows with
 * no on-bill assignees keep their value. Used when a shared link is claimed.
 */
export function deriveMine(items: Item[], meId: string, onBill: ReadonlySet<string>): Item[] {
  return items.map((it) => {
    const sharers = assigneesOf(it).filter((id) => onBill.has(id));
    if (sharers.length === 0) return it;
    const share = sharers.includes(meId) ? mineShare(it.units, sharers.length) : 0;
    return { ...it, yours: formatAmount(share) };
  });
}

export function toggleAssignee(item: Item, id: string, meId?: string, onBill?: ReadonlySet<string>): Item {
  const cur = assigneesOf(item);
  return setAssignees(item, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id], meId, onBill);
}

/** Add `id` to every listed row; rows that already have it (or aren't listed) are returned as-is. */
export function assignAll(
  items: Item[], rowIds: ReadonlySet<string>, id: string, meId?: string, onBill?: ReadonlySet<string>
): Item[] {
  return items.map((it) => {
    if (!rowIds.has(it.id)) return it;
    const cur = assigneesOf(it);
    return cur.includes(id) ? it : setAssignees(it, [...cur, id], meId, onBill);
  });
}

/** If every listed row has `id`, remove it from all of them; otherwise add it to all. */
export function toggleAssigneeAll(
  items: Item[], rowIds: ReadonlySet<string>, id: string, meId?: string, onBill?: ReadonlySet<string>
): Item[] {
  const listed = items.filter((it) => rowIds.has(it.id));
  const allHaveIt = listed.length > 0 && listed.every((it) => assigneesOf(it).includes(id));
  return items.map((it) => {
    if (!rowIds.has(it.id)) return it;
    const cur = assigneesOf(it);
    if (allHaveIt) return cur.includes(id) ? setAssignees(it, cur.filter((x) => x !== id), meId, onBill) : it;
    return cur.includes(id) ? it : setAssignees(it, [...cur, id], meId, onBill);
  });
}

/** Assign the same participant list to every listed row (used by the Everyone toggle). */
export function setAssigneesAll(
  items: Item[], rowIds: ReadonlySet<string>, ids: string[], meId?: string, onBill?: ReadonlySet<string>
): Item[] {
  const deduped = unique(ids);
  return items.map((it) => {
    if (!rowIds.has(it.id)) return it;
    const cur = assigneesOf(it);
    const same = cur.length === deduped.length && deduped.every((id) => cur.includes(id));
    return same ? it : setAssignees(it, deduped, meId, onBill);
  });
}

/** For the listed rows: ids every row has, and ids only some rows have. */
export function assigneeStatus(items: Item[], rowIds: ReadonlySet<string>): { all: string[]; some: string[] } {
  const listed = items.filter((it) => rowIds.has(it.id));
  if (listed.length === 0) return { all: [], some: [] };
  const counts = new Map<string, number>();
  for (const it of listed) {
    for (const id of assigneesOf(it)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const all: string[] = [];
  const some: string[] = [];
  for (const [id, count] of counts) (count === listed.length ? all : some).push(id);
  return { all, some };
}

/** Remove `id` from every row; rows that never had it are returned as-is. */
export function stripAssignee(items: Item[], id: string, meId?: string, onBill?: ReadonlySet<string>): Item[] {
  return items.map((it) => {
    const ids = assigneesOf(it);
    return ids.includes(id) ? setAssignees(it, ids.filter((x) => x !== id), meId, onBill) : it;
  });
}

/** Drop assignee ids that are not on the bill (after a link or file load). */
export function pruneAssignees(items: Item[], participants: Participant[], meId?: string): Item[] {
  const onBill = new Set(participants.map((p) => p.id));
  return items.map((it) => {
    const ids = assigneesOf(it);
    const kept = ids.filter((x) => onBill.has(x));
    return kept.length === ids.length ? it : setAssignees(it, kept, meId);
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

/** Full amount of a row, independent of `Mine`. */
export function lineTotal(item: Item, perUnit: boolean): number {
  const price = parseFloat(item.price) || 0;
  if (!perUnit) return price;
  const units = parseFloat(item.units) || 0;
  return price * units;
}

export interface ExtraLine { label: string; amount: number }

/**
 * Someone's slice of each fee and the tip, in proportion to their items: the
 * same whole-bill-subtotal ratios `calculate` applies to Me. Zero lines are
 * left out; nothing is shown without a Sub Total to divide by.
 */
export function extrasFor(subtotal: number, fees: Fee[], tipAmount: string, billSubtotal: string): ExtraLine[] {
  const denom = parseFloat(billSubtotal);
  if (!(denom > 0) || subtotal === 0) return [];
  const lines = [
    ...fees.map((fee) => ({ label: fee.label.trim() || 'Fee', whole: parseFloat(fee.amount) || 0 })),
    { label: 'Tip', whole: parseFloat(tipAmount) || 0 },
  ];
  return lines
    .filter((l) => l.whole !== 0)
    .map((l) => ({ label: l.label, amount: round2((subtotal * l.whole) / denom) }));
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
