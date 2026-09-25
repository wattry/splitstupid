/**
 * Encode/decode the whole form state as a compact URL-fragment string so a
 * bill can be shared as a link. Items are packed as tuples (ids dropped and
 * regenerated on decode), the JSON is deflated with the native
 * CompressionStream, and the bytes are base64url-encoded — safe to place
 * after `#s=` with no percent-escaping.
 */
import type { Fee, Item, Participant } from '../types.js';
import { feeInputValue, makeFee } from './fees.js';
import { dedupeParticipants } from './participants.js';

export interface SavedState {
  billName: string;
  /** Free-text note shown with the bill; travels with the link. */
  note: string;
  /** Raw OCR text of the last scan, so recipients can check or re-import it. */
  scanText: string;
  billSubtotal: string;
  /** Itemised taxes and fees. */
  fees: Fee[];
  tipAmount: string;
  perUnit: boolean;
  /** Split Even: take an even share of the whole bill instead of line items. */
  splitEven: boolean;
  partySize: string;
  myParty: string;
  /** People on this bill; snapshots so recipients see names without the sender's friend list. */
  participants: Participant[];
  items: Item[];
}

/** [units, yours, desc, price, assignees?] — an Item without its transient id. */
type PackedItem = [string, string, string, string] | [string, string, string, string, string[]];
/** [label, amount] — a Fee without its transient id. */
type PackedFee = [string, string];
/** [id, name] — a Participant. Ids are kept: they are the identity. */
type PackedParticipant = [string, string];

interface Payload {
  v: 1;
  /** Bill name; omitted when blank to keep the link short. */
  n?: string;
  /** Note; omitted when blank. */
  o?: string;
  /** OCR text; omitted when blank. */
  r?: string;
  s: string;
  /** Taxes & fees total; readers without `f` support still see the sum. */
  x: string;
  /**
   * Fee breakdown. Omitted when `x` already says everything: no fees, or
   * one fee labelled "Tax" (what decoding `x` alone produces).
   */
  f?: PackedFee[];
  t: string;
  p: boolean;
  /** Split Even on/off, party size, my party; all omitted when off. */
  e?: boolean;
  z?: string;
  m?: string;
  /** Participants; omitted when nobody is on the bill. */
  u?: PackedParticipant[];
  i: PackedItem[];
}

function bytesToStream(bytes: Uint8Array<ArrayBuffer>): ReadableStream<Uint8Array<ArrayBuffer>> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function pump(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
}

export async function encodeState(state: SavedState): Promise<string> {
  const payload: Payload = {
    v: 1,
    ...(state.billName ? { n: state.billName } : {}),
    ...(state.note.trim() ? { o: state.note } : {}),
    ...(state.scanText.trim() ? { r: state.scanText } : {}),
    s: state.billSubtotal,
    x: feeInputValue(state.fees),
    ...(isPlainTax(state.fees) ? {} : { f: state.fees.map((fee) => [fee.label, fee.amount]) }),
    t: state.tipAmount,
    p: state.perUnit,
    ...(state.splitEven ? { e: true, z: state.partySize, m: state.myParty } : {}),
    ...(state.participants.length
      ? { u: state.participants.map((p) => [p.id, p.name] as PackedParticipant) }
      : {}),
    i: state.items.map((it) => it.assignees?.length
      ? [it.units, it.yours, it.desc, it.price, it.assignees]
      : [it.units, it.yours, it.desc, it.price]),
  };
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const deflated = bytesToStream(json).pipeThrough(new CompressionStream('deflate-raw'));
  return toBase64Url(await pump(deflated));
}

/** True when `x` alone reproduces the fee list: nothing, or a lone "Tax". */
function isPlainTax(fees: Fee[]): boolean {
  return fees.length === 0 || (fees.length === 1 && fees[0]!.label === 'Tax');
}

function isPackedFee(value: unknown): value is PackedFee {
  return Array.isArray(value) && value.length === 2 && value.every((f) => typeof f === 'string');
}

function isPackedParticipant(value: unknown): value is PackedParticipant {
  return Array.isArray(value) && value.length === 2 && value.every((f) => typeof f === 'string');
}

function isPackedItem(value: unknown): value is PackedItem {
  if (!Array.isArray(value) || value.length < 4 || value.length > 5) return false;
  if (!value.slice(0, 4).every((f) => typeof f === 'string')) return false;
  return value.length === 4 || (Array.isArray(value[4]) && value[4].every((f: unknown) => typeof f === 'string'));
}

/** Decode a shared fragment back into form state, or null if it's garbage. */
export async function decodeState(encoded: string): Promise<SavedState | null> {
  try {
    const inflated = bytesToStream(fromBase64Url(encoded)).pipeThrough(
      new DecompressionStream('deflate-raw')
    );
    const data: unknown = JSON.parse(new TextDecoder().decode(await pump(inflated)));
    if (typeof data !== 'object' || data === null) return null;
    const { v, n, o, r, s, x, f, t, p, e, z, m, u, i } = data as Record<string, unknown>;
    if (v !== 1) return null;
    if (n !== undefined && typeof n !== 'string') return null;
    if (o !== undefined && typeof o !== 'string') return null;
    if (r !== undefined && typeof r !== 'string') return null;
    if (typeof s !== 'string' || typeof x !== 'string' || typeof t !== 'string') return null;
    if (typeof p !== 'boolean') return null;
    if (f !== undefined && (!Array.isArray(f) || !f.every(isPackedFee))) return null;
    if (e !== undefined && typeof e !== 'boolean') return null;
    if (z !== undefined && typeof z !== 'string') return null;
    if (m !== undefined && typeof m !== 'string') return null;
    if (u !== undefined && (!Array.isArray(u) || !u.every(isPackedParticipant))) return null;
    if (!Array.isArray(i) || i.length === 0 || !i.every(isPackedItem)) return null;
    const participants = dedupeParticipants((u ?? []).map(([id, name]) => ({ id, name })));
    const onBill = new Set(participants.map((participant) => participant.id));
    return {
      billName: n ?? '',
      note: o ?? '',
      scanText: r ?? '',
      billSubtotal: s,
      fees: f
        ? f.map(([label, amount]) => makeFee({ label, amount }))
        : x === '' ? [] : [makeFee({ label: 'Tax', amount: x })],
      tipAmount: t,
      perUnit: p,
      splitEven: e ?? false,
      partySize: z ?? '4',
      myParty: m ?? '1',
      participants,
      items: i.map(([units, yours, desc, price, who]) => {
        const kept = (who ?? []).filter((id) => onBill.has(id));
        return { id: crypto.randomUUID(), units, yours, desc, price, ...(kept.length ? { assignees: kept } : {}) };
      }),
    };
  } catch {
    return null;
  }
}
