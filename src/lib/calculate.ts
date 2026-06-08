
interface CalculateInput {
  /** This user's owed amount per row (their share of each line item). */
  items: number[];
  /** Whole-bill subtotal — the denominator for the tax and tip ratios. */
  billSubtotal?: number;
  /** Whole-bill tax in dollars. Tax rate = totalTax / billSubtotal. */
  totalTax?: number;
  /** Whole-bill tip in dollars. Tip rate = tipAmt / billSubtotal. */
  tipAmt?: number;
};

interface CalculateOutput {
  subtotal: number;
  taxAmt: number;
  tipAmt: number;
  total: number;
  afterTax: number;
  effectiveTip: number;
}

/**
 * Compute what the user owes.
 *
 * Tax and tip are entered as whole-bill dollar totals. We derive their ratios
 * against the whole-bill subtotal, then apply those ratios to THIS user's share
 * (the sum of their owed line items).
 *
 * @param  calculateInput  contains form input values based on the options a user has provided
 * @returns the display values for the summary
 */
export function calculate(calculateInput: CalculateInput): CalculateOutput {
  const { items, billSubtotal, totalTax } = calculateInput;
  const subtotal = items.reduce((sum, n) => sum + n, 0);

  // Coerce each value to a finite number; missing/null/NaN all count as 0.
  const num = (value: number | null | undefined): number => {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  };

  // Ratios off the whole-bill subtotal; guard against divide-by-zero.
  const denom = num(billSubtotal);
  const taxRate = denom > 0 ? num(totalTax) / denom : 0;
  const tipRate = denom > 0 ? num(calculateInput.tipAmt) / denom : 0;

  // Apply each ratio to this user's share.
  const taxAmt = subtotal * taxRate;
  const tipAmt = subtotal * tipRate;
  // "Actual Tip % on Total": tip measured against "Your Total" (the subtotal).
  const effectiveTip = tipRate;

  const afterTax = subtotal + taxAmt;
  const total = afterTax + tipAmt;

  return { subtotal, taxAmt, tipAmt, total, afterTax, effectiveTip };
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const money = (n: number) => `$${n.toFixed(2)}`;
export const percent = (n: number) => `${(n * 100).toFixed(2)} %`;
