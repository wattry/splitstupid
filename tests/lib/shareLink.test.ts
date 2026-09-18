import { describe, it, expect } from 'vitest';
import { encodeState, decodeState } from '../../src/lib/shareLink.js';
import type { SavedState } from '../../src/lib/shareLink.js';

const state: SavedState = {
  billSubtotal: '42.50',
  totalTax: '3.83',
  tipAmount: '8.00',
  perUnit: true,
  items: [
    { id: 'a', units: '2', yours: '1', desc: 'Pad Thai', price: '12.00' },
    { id: 'b', units: '1', yours: '1', desc: 'Beer', price: '6.50' },
  ],
};

describe('encodeState / decodeState', () => {
  it('round-trips all fields except item ids', async () => {
    const encoded = await encodeState(state);
    const decoded = await decodeState(encoded);
    expect(decoded).not.toBeNull();
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

  it('returns null for garbage input', async () => {
    expect(await decodeState('not-valid-base64!!!')).toBeNull();
    expect(await decodeState('AAAAAAAA')).toBeNull();
    expect(await decodeState('')).toBeNull();
  });

  it('returns null when decoded payload has wrong shape', async () => {
    // Valid encoding of a JSON payload that is not a SavedState.
    const bogus = await encodeState({
      billSubtotal: '1',
      totalTax: '',
      tipAmount: '',
      perUnit: false,
      items: [],
    });
    expect(await decodeState(bogus)).toBeNull();
  });
});
