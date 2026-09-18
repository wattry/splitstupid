/**
 * Share the bill through the device's native share sheet (Web Share API),
 * falling back to copying the link when the browser has no share sheet.
 */
import { money } from './calculate.js';

export interface ShareTextInput {
  name: string;
  subtotal: number;
  taxAmt: number;
  taxPct: number;
  afterTax: number;
  tipAmt: number;
  tipPct: number;
  total: number;
}

/** Plain-text summary of the totals, one per line, bill name on top. */
export function buildShareText(t: ShareTextInput): string {
  const lines = [t.name.trim() || 'Split Stoopid', `Your Total: ${money(t.subtotal)}`];
  if (t.taxAmt > 0) lines.push(`Tax (${t.taxPct.toFixed(2)}%): +${money(t.taxAmt)}`);
  lines.push(`After Tax: ${money(t.afterTax)}`);
  if (t.tipAmt > 0) lines.push(`Tip (${t.tipPct.toFixed(2)}%): +${money(t.tipAmt)}`);
  lines.push(`What I Owe: ${money(t.total)}`);
  return lines.join('\n');
}

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

export type ShareOutcome = 'shared' | 'cancelled' | 'copied' | 'failed';

export async function shareBill(data: ShareData): Promise<ShareOutcome> {
  const nav = navigator as Partial<Navigator>;
  if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare(data))) {
    try {
      await nav.share(data);
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Fall through to the clipboard.
    }
  }
  try {
    await nav.clipboard?.writeText(data.url);
    return nav.clipboard ? 'copied' : 'failed';
  } catch {
    return 'failed';
  }
}
