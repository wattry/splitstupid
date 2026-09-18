import { describe, it, expect, vi, afterEach } from 'vitest';
import { billTitle, buildShareText, shareBill } from '../../src/lib/share.js';

const totals = { subtotal: 42.5, taxAmt: 3.83, afterTax: 46.33, tipAmt: 8, total: 54.33 };

describe('billTitle', () => {
  it('appends the app name to the bill name', () => {
    expect(billTitle(' Dinner ')).toBe('Dinner Split Stoopid');
  });
  it('is just the app name when there is no bill name', () => {
    expect(billTitle('  ')).toBe('Split Stoopid');
  });
});

describe('buildShareText', () => {
  it('lists every total with the bill name on top', () => {
    expect(buildShareText({ name: 'Dinner', taxPct: 9.01, tipPct: 18.82, ...totals })).toBe(
      [
        'Dinner Split Stoopid',
        'Your Total: $42.50',
        'Tax (9.01%): +$3.83',
        'After Tax: $46.33',
        'Tip (18.82%): +$8.00',
        'What U Owe: $54.33',
      ].join('\n')
    );
  });

  it('labels the tax line "Tax + Fees" when fees were itemised', () => {
    const text = buildShareText({ name: 'Dinner', taxPct: 9.01, tipPct: 0, hasFees: true, ...totals, tipAmt: 0 });
    expect(text).toContain('Tax + Fees (9.01%): +$3.83');
    expect(text).not.toContain('Tax (');
  });

  it('drops tax and tip lines when zero and falls back to the app name', () => {
    expect(
      buildShareText({ name: '  ', taxPct: 0, tipPct: 0, ...totals, taxAmt: 0, tipAmt: 0 })
    ).toBe(['Split Stoopid', 'Your Total: $42.50', 'After Tax: $46.33', 'What U Owe: $54.33'].join('\n'));
  });
});

describe('shareBill', () => {
  const data = { text: 'summary', url: 'https://x.test/#s=abc' };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the native share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, canShare: () => true });
    expect(await shareBill(data)).toBe('shared');
    // Link goes inside the text after a blank line; a separate `url` field
    // would be glued straight onto the text by the share sheet.
    // No `title`: targets that honor it would show the bill name twice, since
    // the summary text already starts with it.
    expect(share).toHaveBeenCalledWith({ text: 'summary\n\nhttps://x.test/#s=abc' });
  });

  it('reports cancelled when the user closes the sheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('x', 'AbortError'));
    vi.stubGlobal('navigator', { share, canShare: () => true });
    expect(await shareBill(data)).toBe('cancelled');
  });

  it('copies the link to the clipboard when Web Share is missing', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await shareBill(data)).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(data.url);
  });

  it('reports failed when neither share nor clipboard works', async () => {
    vi.stubGlobal('navigator', {});
    expect(await shareBill(data)).toBe('failed');
  });
});
