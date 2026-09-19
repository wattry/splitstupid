/**
 * Parse OCR'd receipt text into structured line items.
 *
 * Each kept line becomes { units, desc, lineTotal } where:
 *   - units     = leading integer on the line (defaults to 1 if none)
 *   - desc      = text between the units and the first price token
 *   - lineTotal = last price token on the line (the total for all units)
 *
 * Per-unit price (lineTotal / units) is derived later, by whoever builds the
 * editable rows, since that depends on the per-unit/total display toggle.
 *
 * Same noise filtering as price extraction: skip lines naming totals/tax/dates,
 * long digit runs (phone/ids), and date fragments.
 *
 * @param {string} text raw OCR text
 * @returns {{ units: number, desc: string, lineTotal: number }[]}
 */

import type { ParsedLineItem } from '../types.js';

const SKIP_LINE =
  /total|subtotal|sub-total|\btax\b|change|\bcash\b|\bcard\b|credit|debit|balance|\btip\b|gratuity|\bdate\b|\btel\b|phone|visa|mastercard|amex|acct|account|\bauth\b|\bref\b|invoice|receipt|order\s*#|server|table/i;

const LONG_DIGITS = /\d{5,}/;
const DATE_LIKE = /\d{1,2}[/-]\d{1,2}/;
// A price token: a decimal amount, with an optional leading currency sign
// ($ or £, and optional space after it). "$13.00", "£13.00" and "13.00" all
// match.
const PRICE = /[$£]?\s?\d+\.\d{2}/;
const PRICE_G = /[$£]?\s?\d+\.\d{2}/g;
// Quantity: first standalone 1–2 digit integer that's followed by a word.
// Not anchored to line start — OCR often emits junk ("ae", "RE TEA", "“08")
// before the real quantity. The word lookahead keeps junk digits (followed by
// another number, not a name) from being mistaken for it, and taking the FIRST
// match keeps numbers inside the item name ("Coke 12 oz") out of the quantity.
const QTY_BEFORE_WORD = /(?:^|\s)(\d{1,2})\s+(?=[A-Za-z])/;
// Any leading number (integer or decimal) followed by space — stripped from the
// description so a quantity like "2" or "2.00" doesn't bleed into the item name.
const LEADING_NUM = /^\s*\d+(?:\.\d+)?\s+/;

const toNumber = (token: string) => Number(token.replace(/[^\d.]/g, ''));

export function parseLineItems(text?: string | null): ParsedLineItem[] {
  if (!text) return [];

  const items: ParsedLineItem[] = [];
  // A price-less line that starts like an item ("2 Migration Brewing…") is a
  // wrapped item name: printers break long names, leaving the quantity and the
  // name's start on a line of their own. Held for one line only — anything
  // else in between clears it.
  let pending: string | null = null;
  for (const rawLine of text.split('\n')) {
    let line = rawLine.trim();
    if (!line) continue;
    if (SKIP_LINE.test(line)) continue;
    if (DATE_LIKE.test(line)) continue;
    if (LONG_DIGITS.test(line)) continue;

    const prices = line.match(PRICE_G);
    if (!prices) {
      pending = QTY_BEFORE_WORD.test(line) ? line : null;
      continue;
    }

    // Priced line without its own quantity + a pending wrapped start → join.
    if (pending && !QTY_BEFORE_WORD.test(line.slice(0, line.search(PRICE)))) {
      line = `${pending} ${line}`;
    }
    pending = null;

    // The price sits in the rightmost column, so the LAST token is the line
    // total — this also means a leading quantity can never be mistaken for it.
    const lastPrice = prices[prices.length - 1];
    if (!lastPrice) continue;
    const lineTotal = toNumber(lastPrice);
    if (!Number.isFinite(lineTotal) || lineTotal <= 0) continue;

    // Quantity is searched only before the first price so a price can never
    // be read as a quantity.
    const firstPriceIdx = line.search(PRICE);
    const beforePrice = firstPriceIdx >= 0 ? line.slice(0, firstPriceIdx) : line;
    const qtyMatch = QTY_BEFORE_WORD.exec(beforePrice);
    const units = qtyMatch?.[1] ? parseInt(qtyMatch[1], 10) || 1 : 1;

    // Description = text after the quantity (dropping any junk before it),
    // before the first price. No quantity → keep the line minus any bare
    // leading number.
    const rest = qtyMatch
      ? line.slice(qtyMatch.index + qtyMatch[0].length)
      : line.replace(LEADING_NUM, '');
    const priceIdx = rest.search(PRICE);
    const desc = (priceIdx >= 0 ? rest.slice(0, priceIdx) : rest)
      .replace(/[$£]/g, '')
      .trim();

    items.push({ units, desc, lineTotal });
  }
  return items;
}
