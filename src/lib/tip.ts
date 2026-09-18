/** Tip percentages offered by the "HELP ME" picker. */
export const TIP_PRESETS = [10, 15, 20, 25] as const;

/** Tip in dollars (fixed-2 string) for `pct` percent of the whole-bill subtotal. */
export function tipForPercent(subtotal: string, pct: number): string {
  const base = parseFloat(subtotal) || 0;
  return (Math.round(base * pct) / 100).toFixed(2);
}
