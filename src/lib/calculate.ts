
interface CalculateInput {
  items: number[];
  stateTax: number;
  localTax: number;
  customTipPct: number;
  tipPct: number;
  preTax: number;
  flatTip: number;
};

interface CalculateOutput {
  subtotal: number;
  taxAmt: number;
  localTaxAmt: number;
  tipAmt: number;
  total: number;
  afterTax: number;
  effectiveTip: number;
}

/**
 * Compute what the user owes.
 *
 * @param  calculateInput  contains form input values based on the options a user has provided
 * @returns the display values for the summary
 */
export function calculate(calculateInput: CalculateInput): CalculateOutput {
  const { items, stateTax, localTax, customTipPct, tipPct, preTax, flatTip } = calculateInput;
  const subtotal = items.reduce((sum, n) => sum + n, 0);

  const taxRate: number = Number.isFinite(stateTax) ? stateTax : 0;
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

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const money = (n: number) => `$${n.toFixed(2)}`;
export const percent = (n: number) => `${(n * 100).toFixed(2)} %`;
