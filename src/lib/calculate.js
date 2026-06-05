/**
 * Compute what the user owes.
 *
 * @param {object}   params
 * @param {number[]} params.items     parsed item prices
 * @param {number}   params.stateTax  tax percent (e.g. 8.25). NaN/undefined => 0
 * @param {number|null} params.tipPct tip percent. null => 0 (WTF option)
 * @param {boolean}  params.preTax    true => tip on subtotal; false => tip on subtotal + tax
 * @returns {{subtotal:number, taxAmt:number, tipAmt:number, total:number}}
 */
export function calculate({ items, stateTax, tipPct, preTax }) {
  const subtotal = items.reduce((sum, n) => sum + n, 0)

  const taxRate = Number.isFinite(stateTax) ? stateTax : 0
  const taxAmt = subtotal * (taxRate / 100)

  const tipRate = Number.isFinite(tipPct) ? tipPct : 0
  const tipBase = preTax ? subtotal : subtotal + taxAmt
  const tipAmt = tipBase * (tipRate / 100)

  const total = subtotal + taxAmt + tipAmt
  return { subtotal, taxAmt, tipAmt, total }
}
