/**
 * Parse whole-bill totals out of OCR'd receipt text.
 *
 * Complements parseLineItems: the totals lines (subtotal/tax/tip/total) that
 * the line-item parser deliberately skips are exactly the ones read here. Each
 * field is taken from the first line naming it; the value is the last
 * price-shaped token on that line (prices sit in the rightmost column).
 *
 * If no subtotal line was read but a total was, subtotal is derived as
 * total - tax - tip so the form can still be prefilled.
 *
 * @param {string} text raw OCR text
 * @returns fields confidently found; absent keys mean "not on the receipt"
 */

import type { ParsedTotals } from '../types.js';

const PRICE_G = /[$£]\s?\d+(?:\.\s?\d{2}|(?=\s*$))|\d+\.\s?\d{2}/g;

// Ordered: a line is claimed by the first matching field, so SUBTOTAL must be
// tested before TOTAL ("Subtotal 8.00" contains the word "total").
const FIELDS = [
  { key: 'subtotal', re: /sub[\s-]?total/i },
  { key: 'tax', re: /\btax\b/i },
  { key: 'tip', re: /\btip\b|gratuity/i },
  { key: 'total', re: /\btotal\b/i },
] as const;

const round2 = (n: number) => Math.round(n * 100) / 100;

const toNumber = (token: string) => Number(token.replace(/[^\d.]/g, ''));

export function parseTotals(text?: string | null): ParsedTotals {
  const totals: ParsedTotals = {};
  if (!text) return totals;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const field = FIELDS.find((f) => f.re.test(line));
    if (!field || totals[field.key] !== undefined) continue;

    const prices = line.match(PRICE_G);
    if (!prices) continue;
    const value = toNumber(prices[prices.length - 1] as string);
    if (!Number.isFinite(value) || value <= 0) continue;

    totals[field.key] = value;
  }

  // Derive only when tax/tip give the total something to subtract — a bare
  // "Total" line alone says nothing about the pre-tax subtotal.
  if (
    totals.subtotal === undefined &&
    totals.total !== undefined &&
    (totals.tax !== undefined || totals.tip !== undefined)
  ) {
    const derived = round2(totals.total - (totals.tax ?? 0) - (totals.tip ?? 0));
    if (derived > 0) totals.subtotal = derived;
  }

  return totals;
}
