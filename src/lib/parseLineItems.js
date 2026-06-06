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

const SKIP_LINE =
  /total|subtotal|sub-total|\btax\b|change|\bcash\b|\bcard\b|credit|debit|balance|\btip\b|gratuity|\bdate\b|\btel\b|phone|visa|mastercard|amex|acct|account|\bauth\b|\bref\b|invoice|receipt|order\s*#|server|table/i

const LONG_DIGITS = /\d{5,}/
const DATE_LIKE = /\d{1,2}[/-]\d{1,2}/
// A $-tagged amount is unambiguously the money, so it wins over bare decimals
// (which can be a quantity, weight, or stray number). Bare is the fallback.
const PRICE_DOLLAR = /\$\s?\d+\.\d{2}/
const PRICE_DOLLAR_G = /\$\s?\d+\.\d{2}/g
const PRICE_BARE = /\d+\.\d{2}/
const PRICE_BARE_G = /\d+\.\d{2}/g
const LEADING_QTY = /^(\d{1,2})\s+/

const toNumber = (token) => Number(token.replace(/[^\d.]/g, ''))

export function parseLineItems(text) {
  if (!text) return []

  const items = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    if (SKIP_LINE.test(line)) continue
    if (DATE_LIKE.test(line)) continue
    if (LONG_DIGITS.test(line)) continue

    // Prefer $-tagged amounts; fall back to bare decimals if none on the line.
    const hasDollar = PRICE_DOLLAR.test(line)
    const priceRe = hasDollar ? PRICE_DOLLAR : PRICE_BARE
    const prices = line.match(hasDollar ? PRICE_DOLLAR_G : PRICE_BARE_G)
    if (!prices) continue

    const lineTotal = toNumber(prices[prices.length - 1])
    if (!Number.isFinite(lineTotal) || lineTotal <= 0) continue

    // Leading quantity → prepopulate units; strip it off before reading desc.
    let units = 1
    let rest = line
    const qtyMatch = line.match(LEADING_QTY)
    if (qtyMatch) {
      units = parseInt(qtyMatch[1], 10) || 1
      rest = line.slice(qtyMatch[0].length)
    }

    // Description = everything before the first price on the remaining text.
    const priceIdx = rest.search(priceRe)
    const desc = (priceIdx >= 0 ? rest.slice(0, priceIdx) : rest)
      .replace(/\$/g, '')
      .trim()

    items.push({ units, desc, lineTotal })
  }
  return items
}
