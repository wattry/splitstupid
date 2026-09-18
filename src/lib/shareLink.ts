/**
 * Encode/decode the whole form state as a compact URL-fragment string so a
 * bill can be shared as a link. Items are packed as tuples (ids dropped and
 * regenerated on decode), the JSON is deflated with the native
 * CompressionStream, and the bytes are base64url-encoded — safe to place
 * after `#s=` with no percent-escaping.
 */
import type { Item } from '../types.js';

export interface SavedState {
  billName: string;
  billSubtotal: string;
  totalTax: string;
  tipAmount: string;
  perUnit: boolean;
  /** Split Even: take an even share of the whole bill instead of line items. */
  splitEven: boolean;
  partySize: string;
  myParty: string;
  items: Item[];
}

/** [units, yours, desc, price] — an Item without its transient id. */
type PackedItem = [string, string, string, string];

interface Payload {
  v: 1;
  /** Bill name; omitted when blank to keep the link short. */
  n?: string;
  s: string;
  x: string;
  t: string;
  p: boolean;
  /** Split Even on/off, party size, my party; all omitted when off. */
  e?: boolean;
  z?: string;
  m?: string;
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
    s: state.billSubtotal,
    x: state.totalTax,
    t: state.tipAmount,
    p: state.perUnit,
    ...(state.splitEven ? { e: true, z: state.partySize, m: state.myParty } : {}),
    i: state.items.map((it) => [it.units, it.yours, it.desc, it.price]),
  };
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const deflated = bytesToStream(json).pipeThrough(new CompressionStream('deflate-raw'));
  return toBase64Url(await pump(deflated));
}

function isPackedItem(value: unknown): value is PackedItem {
  return Array.isArray(value) && value.length === 4 && value.every((f) => typeof f === 'string');
}

/** Decode a shared fragment back into form state, or null if it's garbage. */
export async function decodeState(encoded: string): Promise<SavedState | null> {
  try {
    const inflated = bytesToStream(fromBase64Url(encoded)).pipeThrough(
      new DecompressionStream('deflate-raw')
    );
    const data: unknown = JSON.parse(new TextDecoder().decode(await pump(inflated)));
    if (typeof data !== 'object' || data === null) return null;
    const { v, n, s, x, t, p, e, z, m, i } = data as Record<string, unknown>;
    if (v !== 1) return null;
    if (n !== undefined && typeof n !== 'string') return null;
    if (typeof s !== 'string' || typeof x !== 'string' || typeof t !== 'string') return null;
    if (typeof p !== 'boolean') return null;
    if (e !== undefined && typeof e !== 'boolean') return null;
    if (z !== undefined && typeof z !== 'string') return null;
    if (m !== undefined && typeof m !== 'string') return null;
    if (!Array.isArray(i) || i.length === 0 || !i.every(isPackedItem)) return null;
    return {
      billName: n ?? '',
      billSubtotal: s,
      totalTax: x,
      tipAmount: t,
      perUnit: p,
      splitEven: e ?? false,
      partySize: z ?? '4',
      myParty: m ?? '1',
      items: i.map(([units, yours, desc, price]) => ({
        id: crypto.randomUUID(),
        units,
        yours,
        desc,
        price,
      })),
    };
  } catch {
    return null;
  }
}
