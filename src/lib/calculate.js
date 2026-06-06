/**
 * Compute what the user owes.
 *
 * @param {object}   params
 * @param {number[]} params.items     parsed item prices
 * @param {number}   params.stateTax  tax percent (e.g. 8.25). NaN/undefined => 0
 * @param {number}   params.localTax  tax percent (e.g. 8.25). NaN/undefined => 0
 * @param {number|null} params.tipPct tip percent. null => 0 (WTF option)
 * @param {boolean}  params.preTax    true => tip on subtotal; false => tip on subtotal + tax
 * @param {boolean}  [params.flatTip] true => flat-amount tip mode; effectiveTip
 *                                    is reported against the after-tax base so it
 *                                    matches the derived "tip % of the bill"
 * @returns {{subtotal:number, taxAmt:number, tipAmt:number, total:number}}
 */
export function calculate({ items, stateTax, localTax, customTipPct, tipPct, preTax, flatTip }) {
  const subtotal = items.reduce((sum, n) => sum + n, 0);

  const taxRate = Number.isFinite(stateTax) ? stateTax : 0;
  const localTaxRate = Number.isFinite(localTax) ? localTax : 0;
  const taxAmt = subtotal * (taxRate / 100);
  const localTaxAmt = subtotal * (localTaxRate / 100);

  const tipRate = Number.isFinite(tipPct) ? tipPct : 0;
  const customTipRate = Number.isFinite(customTipPct) ? customTipPct : 0;

  const tipBase = preTax ? subtotal : subtotal + taxAmt + localTaxAmt;
  const tipAmt = tipBase * ((tipRate + customTipRate) / 100);
  // Flat tip: report the rate against the after-tax base (= tipBase here) so it
  // matches the "tip % of the after-tax bill" shown in flat mode.
  const effectiveTip = flatTip
    ? (tipBase > 0 ? tipAmt / tipBase : 0)
    : (preTax ? 0 : tipAmt / subtotal);

  const afterTax = subtotal + taxAmt + localTaxAmt;
  const total = afterTax + tipAmt;

  return { subtotal, taxAmt, localTaxAmt, tipAmt, total, afterTax, effectiveTip };
}
