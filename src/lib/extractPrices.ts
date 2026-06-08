/**
 * Pull likely item prices out of raw OCR'd receipt text.
 *
 * Receipt OCR returns the whole receipt — item lines, but also store name,
 * date, phone, subtotal, tax, total, payment info. We work line-by-line and
 * drop the lines that clearly aren't items, then grab price-shaped tokens
 * (e.g. 12.50, 1234.56) from what's left.
 *
 * This is heuristic: it favours dropping non-items over perfect recall. The
 * user reviews/edits the result in the items textarea afterwards.
 *
 * @param {string} text raw OCR text
 * @returns {number[]} detected item prices, in reading order
 */

// Lines whose text names a non-item field. Case-insensitive.
const SKIP_LINE =
  /total|subtotal|sub-total|sub\ total|\btax\b|change|\bcash\b|\bcard\b|credit|debit|balance|\btip\b|gratuity|\bdate\b|\btel\b|phone|visa|mastercard|amex|acct|account|\bauth\b|\bref\b|invoice|receipt|order\s*#|server|table|qty/i;

// 5+ consecutive digits => phone number, card digits, store/order id, etc.
const LONG_DIGITS = /\d{5,}/;

// 12/25 or 12-25 style => a date fragment.
const DATE_LIKE = /\d{1,2}[/-]\d{1,2}/;

// A price: one or more digits, a dot, exactly two decimals.
const PRICE = /\d+\.\d{2}/g;

export function extractPrices(text: string) {
  if (!text) return [];

  const prices = [];
  for (const rawLine of text.split('\n')) {

    const line = rawLine.trim().toLowerCase();
    if (!line) continue;
    if (SKIP_LINE.test(line)) continue;
    if (DATE_LIKE.test(line)) continue;
    if (LONG_DIGITS.test(line)) continue;

    const matches = line.match(PRICE);
    if (!matches) continue;

    for (const m of matches) {
      const n = Number(m);
      if (Number.isFinite(n) && n > 0) prices.push(n);
    }
  }
  return prices;
}
