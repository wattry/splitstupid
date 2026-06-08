
interface CalculateInput {
  items: number[];
  stateTax: number;
  /** Local tax percent. Omitted or NaN counts as 0%. */
  localTax?: number;
  /** Extra custom tip percent (WTF mode). Omitted or NaN counts as 0%. */
  customTipPct?: number;
  /** Base tip percent. `null` (WTF, no tip) counts as 0%. */
  tipPct: number | null;
  /** Tip on the pre-tax subtotal when true, otherwise on the after-tax bill. */
  preTax: boolean;
  /** Flat-tip mode: report the effective rate against the after-tax base. */
  flatTip?: boolean;
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

  // Coerce each rate to a finite number; missing/null/NaN all count as 0.
  const rate = (value: number | null | undefined): number => {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  };

  const taxRate = rate(stateTax);
  const localTaxRate = rate(localTax);
  const taxAmt = subtotal * (taxRate / 100);
  const localTaxAmt = subtotal * (localTaxRate / 100);

  const tipRate = rate(tipPct);
  const customTipRate = rate(customTipPct);

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
