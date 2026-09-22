/**
 * Parse OCR'd receipt text into structured line items.
 *
 * Each kept line becomes { units, desc, lineTotal } where:
 *   - units     = leading integer on the line ("2 Roast Beef  52.00"), else a
 *                 lone integer just before the price ("Cuvee Brut  4  117.60",
 *                 the Item/Qty/Price layout), else 1
 *   - desc      = the line minus the quantity and the price tokens
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
  /total|subtotal|sub-total|\btax\b|change|\bcash\b|\bcard\b|credit|debit|balance|\btip\b|gratuity|\bdate\b|\btel\b|phone|visa|mastercard|amex|acct|account|\bauth\b|\bref\b|invoice|receipt|order\s*#|server|table|original price|regular price|reg\.? price/i;

const LONG_DIGITS = /\d{5,}/;
const DATE_LIKE = /\d{1,2}[/-]\d{1,2}/;
// A price token: an amount with a currency sign ($ or £, optional space after
// it) and cents, or a bare decimal with cents; or, at the end of the line
// only, a signed amount without cents so a hand-typed "$112" counts (mid-line
// "£1 SHIFT" is OCR junk, not a price). A bare integer is never a price — it
// would clash with quantities. OCR sometimes gaps the cents ("$30. 00"),
// so a space after the dot is tolerated; toNumber drops it.
const PRICE = /[$£]\s?\d+(?:\.\s?\d{2}|(?=\s*$))|\d+\.\s?\d{2}/;
const PRICE_G = /[$£]\s?\d+(?:\.\s?\d{2}|(?=\s*$))|\d+\.\s?\d{2}/g;
// Quantity: first standalone 1–2 digit integer that's followed by a word.
// Not anchored to line start — OCR often emits junk ("ae", "RE TEA", "“08")
// before the real quantity. The word lookahead keeps junk digits (followed by
// another number, not a name) from being mistaken for it, and taking the FIRST
// match keeps numbers inside the item name ("Coke 12 oz") out of the quantity.
const QTY_BEFORE_WORD = /(?:^|\s)(\d{1,2})\s+(?=[A-Za-z])/;
// A 1–2 digit integer at the very start of the line is a quantity whatever
// follows it (even OCR junk like "5£1"); a longer number there is a name.
const QTY_AT_START = /^(\d{1,2})\s+/;
// Quantity in the Item/Qty/Price layout: a lone 1–2 digit integer as the last
// thing before the price. Matched against the text before the first price.
const QTY_BEFORE_PRICE = /\s(\d{1,2})\s*$/;
// A leading decimal like "2.00 " is a quantity written as a number, never part
// of a name or the price. (A bare leading integer such as a wine's vintage
// year is left in the name unless it was taken as the quantity.)
const LEADING_DECIMAL = /^\s*\d+\.\d+\s+/;

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
    // be read as a quantity. A leading quantity wins; otherwise look for one
    // sitting just before the price (Item / Qty / Price columns).
    // A leading decimal ("2.00 Margarita $13.00") is a quantity, not a price
    // or a name: drop it before splitting the line around the price.
    const body = line.replace(LEADING_DECIMAL, '');
    const firstPriceIdx = body.search(PRICE);
    const beforePrice = firstPriceIdx >= 0 ? body.slice(0, firstPriceIdx) : body;
    const leading = QTY_AT_START.exec(beforePrice) ?? QTY_BEFORE_WORD.exec(beforePrice);
    const trailing = leading ? null : QTY_BEFORE_PRICE.exec(beforePrice);
    const qtyToken = leading?.[1] ?? trailing?.[1];
    const units = qtyToken ? parseInt(qtyToken, 10) || 1 : 1;

    // Description = what's left before the price once the quantity is gone.
    let rest = beforePrice;
    if (leading) rest = rest.slice(leading.index + leading[0].length);
    else if (trailing) rest = rest.slice(0, trailing.index);
    const desc = rest.replace(/[$£]/g, '').trim();

    items.push({ units, desc, lineTotal });
  }
  return items;
}
