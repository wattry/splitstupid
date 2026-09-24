import { describe, it, expect } from 'vitest';
import { encodeState, decodeState } from '../../src/lib/shareLink.js';
import type { SavedState } from '../../src/lib/shareLink.js';

const state: SavedState = {
  billName: 'Thai night',
  note: '',
  scanText: '',
  billSubtotal: '42.50',
  fees: [{ id: 'f1', label: 'Tax', amount: '3.83' }],
  tipAmount: '8.00',
  perUnit: true,
  splitEven: false,
  partySize: '',
  myParty: '1',
  participants: [],
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
    expect(decoded!.fees.map(({ id: _id, ...rest }) => rest)).toEqual([{ label: 'Tax', amount: '3.83' }]);
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

  it('round-trips split even fields', async () => {
    const decoded = await decodeState(
      await encodeState({ ...state, splitEven: true, partySize: '4', myParty: '2' })
    );
    expect(decoded!.splitEven).toBe(true);
    expect(decoded!.partySize).toBe('4');
    expect(decoded!.myParty).toBe('2');
  });

  it('omits split even fields from the payload when off', async () => {
    const on = await encodeState({ ...state, splitEven: true, partySize: '4', myParty: '2' });
    const off = await encodeState(state);
    expect(off.length).toBeLessThan(on.length);
  });

  it('decodes links without split even fields as split even off', async () => {
    const legacy = await encodeLegacy({
      v: 1,
      s: '10',
      x: '1',
      t: '2',
      p: false,
      i: [['1', '1', 'Soup', '10']],
    });
    const decoded = await decodeState(legacy);
    expect(decoded!.splitEven).toBe(false);
    expect(decoded!.partySize).toBe('4');
    expect(decoded!.myParty).toBe('1');
  });

  it('returns null when split even fields have the wrong type', async () => {
    const bad = await encodeLegacy({
      v: 1, s: '10', x: '1', t: '2', p: false, i: [['1', '1', 'Soup', '10']],
      e: true, z: 4, m: '1',
    });
    expect(await decodeState(bad)).toBeNull();
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
      note: '',
      scanText: '',
      billSubtotal: '1',
      fees: [],
      tipAmount: '',
      perUnit: false,
      splitEven: false,
      partySize: '',
      myParty: '1',
      participants: [],
      items: [],
    });
    expect(await decodeState(bogus)).toBeNull();
  });

  it('round-trips participants keeping their ids', async () => {
    const withPeople: SavedState = {
      ...state,
      participants: [
        { id: 'id-sam', name: 'Sam' },
        { id: 'id-alex', name: 'Alex Kim' },
      ],
    };
    const decoded = await decodeState(await encodeState(withPeople));
    expect(decoded!.participants).toEqual(withPeople.participants);
  });

  it('omits participants from the payload when there are none', async () => {
    const a = await encodeState(state);
    const b = await encodeState({ ...state, participants: [] });
    expect(a).toBe(b);
    const decoded = await decodeState(a);
    expect(decoded!.participants).toEqual([]);
  });

  it('decodes links without participants as an empty list', async () => {
    const legacy = await encodeLegacy({
      v: 1, s: '10', x: '1', t: '2', p: false, i: [['1', '1', 'Soup', '10']],
    });
    const decoded = await decodeState(legacy);
    expect(decoded!.participants).toEqual([]);
  });

  it('returns null when participants are malformed', async () => {
    const bad = await encodeLegacy({
      v: 1, s: '10', x: '1', t: '2', p: false, i: [['1', '1', 'Soup', '10']],
      u: [['id-only']],
    });
    expect(await decodeState(bad)).toBeNull();
  });

  it('collapses duplicate participant ids to the first', async () => {
    const legacy = await encodeLegacy({
      v: 1, s: '10', x: '1', t: '2', p: false, i: [['1', '1', 'Soup', '10']],
      u: [['id-sam', 'Sam'], ['id-sam', 'Sammy']],
    });
    const decoded = await decodeState(legacy);
    expect(decoded!.participants).toEqual([{ id: 'id-sam', name: 'Sam' }]);
  });

  it('drops participants with a blank name', async () => {
    const legacy = await encodeLegacy({
      v: 1, s: '10', x: '1', t: '2', p: false, i: [['1', '1', 'Soup', '10']],
      u: [['id-sam', 'Sam'], ['id-blank', '   ']],
    });
    const decoded = await decodeState(legacy);
    expect(decoded!.participants).toEqual([{ id: 'id-sam', name: 'Sam' }]);
  });
});

describe('fees', () => {
  const fees = [
    { id: 'a', label: 'Tax', amount: '1.50' },
    { id: 'b', label: 'Service fee', amount: '2' },
    { id: 'c', label: '', amount: '0.25' },
  ];

  it('round-trips several labelled fees with fresh ids', async () => {
    const decoded = await decodeState(await encodeState({ ...state, fees }));
    expect(decoded!.fees.map(({ id: _id, ...rest }) => rest)).toEqual(
      fees.map(({ id: _id, ...rest }) => rest)
    );
    const ids = decoded!.fees.map((f) => f.id);
    expect(ids).not.toContain('a');
    expect(new Set(ids).size).toBe(3);
  });

  it('round-trips no fees', async () => {
    const decoded = await decodeState(await encodeState({ ...state, fees: [] }));
    expect(decoded!.fees).toEqual([]);
  });

  it('keeps a single plain Tax fee out of the breakdown to keep the link short', async () => {
    const single = await encodeState(state);
    const named = await encodeState({ ...state, fees: [{ id: 'a', label: 'VAT', amount: '3.83' }] });
    expect(single.length).toBeLessThan(named.length);
  });

  it('decodes legacy links carrying only a tax total as a single Tax fee', async () => {
    const legacy = await encodeLegacy({
      v: 1, s: '10', x: '1.20', t: '2', p: false, i: [['1', '1', 'Soup', '10']],
    });
    const decoded = await decodeState(legacy);
    expect(decoded!.fees.map(({ id: _id, ...rest }) => rest)).toEqual([{ label: 'Tax', amount: '1.20' }]);
  });

  it('decodes a legacy blank tax total as no fees', async () => {
    const legacy = await encodeLegacy({
      v: 1, s: '10', x: '', t: '2', p: false, i: [['1', '1', 'Soup', '10']],
    });
    expect((await decodeState(legacy))!.fees).toEqual([]);
  });

  it('returns null when the fee breakdown has the wrong shape', async () => {
    const bad = await encodeLegacy({
      v: 1, s: '10', x: '1', t: '2', p: false, i: [['1', '1', 'Soup', '10']], f: [['Tax', 1]],
    });
    expect(await decodeState(bad)).toBeNull();
  });
});

describe('note', () => {
  it('round-trips a note', async () => {
    const decoded = await decodeState(await encodeState({ ...state, note: 'Cash only, pay by Friday' }));
    expect(decoded!.note).toBe('Cash only, pay by Friday');
  });

  it('decodes a missing note as blank and omits it from the link when blank', async () => {
    const decoded = await decodeState(await encodeState({ ...state, note: '' }));
    expect(decoded!.note).toBe('');
    const withNote = await encodeState({ ...state, note: 'x'.repeat(40) });
    const without = await encodeState({ ...state, note: '' });
    expect(without.length).toBeLessThan(withNote.length);
  });
});

describe('scanText', () => {
  it('round-trips the OCR text with its whitespace intact', async () => {
    const text = '2 Roast Beef         £52.00\n1 Diet Coke          £3.75';
    const decoded = await decodeState(await encodeState({ ...state, scanText: text }));
    expect(decoded!.scanText).toBe(text);
  });

  it('decodes a missing OCR text as blank and omits it from the link when blank', async () => {
    const decoded = await decodeState(await encodeState({ ...state, scanText: '' }));
    expect(decoded!.scanText).toBe('');
    const withText = await encodeState({ ...state, scanText: 'x'.repeat(40) });
    const without = await encodeState({ ...state, scanText: '' });
    expect(without.length).toBeLessThan(withText.length);
  });
});
