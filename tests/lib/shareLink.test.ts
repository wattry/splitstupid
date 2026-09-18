import { describe, it, expect } from 'vitest';
import { encodeState, decodeState } from '../../src/lib/shareLink.js';
import type { SavedState } from '../../src/lib/shareLink.js';

const state: SavedState = {
  billName: 'Thai night',
  billSubtotal: '42.50',
  totalTax: '3.83',
  tipAmount: '8.00',
  perUnit: true,
  items: [
    { id: 'a', units: '2', yours: '1', desc: 'Pad Thai', price: '12.00' },
    { id: 'b', units: '1', yours: '1', desc: 'Beer', price: '6.50' },
  ],
};

/** Deflate + base64url an arbitrary object the same way encodeState does. */
async function encodeLegacy(payload: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const source = new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) {
      controller.enqueue(json);
      controller.close();
    },
  });
  const reader = source.pipeThrough(new CompressionStream('deflate-raw')).getReader();
  const chunks: number[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(...value);
  }
  const bytes = Uint8Array.from(chunks);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('encodeState / decodeState', () => {
  it('round-trips all fields except item ids', async () => {
    const encoded = await encodeState(state);
    const decoded = await decodeState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.billName).toBe('Thai night');
    expect(decoded!.billSubtotal).toBe('42.50');
    expect(decoded!.totalTax).toBe('3.83');
    expect(decoded!.tipAmount).toBe('8.00');
    expect(decoded!.perUnit).toBe(true);
    expect(decoded!.items.map(({ id: _id, ...rest }) => rest)).toEqual(
      state.items.map(({ id: _id, ...rest }) => rest)
    );
  });

  it('regenerates fresh item ids on decode', async () => {
    const decoded = await decodeState(await encodeState(state));
    const ids = decoded!.items.map((i) => i.id);
    expect(ids).not.toContain('a');
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toBeTruthy());
  });

  it('produces a URL-safe string (no +, /, =, #, &)', async () => {
    const encoded = await encodeState(state);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('handles unicode and special characters in descriptions', async () => {
    const s = {
      ...state,
      items: [{ id: 'x', units: '1', yours: '1', desc: 'Crème brûlée 🍮 #1 & "more"', price: '9' }],
    };
    const decoded = await decodeState(await encodeState(s));
    expect(decoded!.items[0]?.desc).toBe('Crème brûlée 🍮 #1 & "more"');
  });

  it('round-trips an empty bill name', async () => {
    const decoded = await decodeState(await encodeState({ ...state, billName: '' }));
    expect(decoded!.billName).toBe('');
  });

  it('omits the name from the payload when empty', async () => {
    const withName = await encodeState(state);
    const without = await encodeState({ ...state, billName: '' });
    expect(without.length).toBeLessThan(withName.length);
  });

  it('decodes legacy links that carry no name as an empty name', async () => {
    // Fragment produced before billName existed (v1 payload without `n`).
    const legacy = await encodeLegacy({
      v: 1,
      s: '10',
      x: '1',
      t: '2',
      p: false,
      i: [['1', '1', 'Soup', '10']],
    });
    const decoded = await decodeState(legacy);
    expect(decoded).not.toBeNull();
    expect(decoded!.billName).toBe('');
    expect(decoded!.billSubtotal).toBe('10');
  });

  it('returns null for garbage input', async () => {
    expect(await decodeState('not-valid-base64!!!')).toBeNull();
    expect(await decodeState('AAAAAAAA')).toBeNull();
    expect(await decodeState('')).toBeNull();
  });

  it('returns null when decoded payload has wrong shape', async () => {
    // Valid encoding of a JSON payload that is not a SavedState.
    const bogus = await encodeState({
      billName: '',
      billSubtotal: '1',
      totalTax: '',
      tipAmount: '',
      perUnit: false,
      items: [],
    });
    expect(await decodeState(bogus)).toBeNull();
  });
});
