/**
 * Shared domain types for the bill-splitter.
 *
 * The editable item rows are form state: every numeric field is held as the raw
 * string the `<input>` produces, and parsed with `parseFloat`/`Number` at the
 * point of use. Keeping them as strings keeps the controlled inputs and the
 * parsing in agreement.
 */

/** A single editable receipt row. */
export interface Item {
  id: string;
  /** Count printed on the receipt. */
  units: string;
  /** How many of those units are yours. */
  yours: string;
  desc: string;
  /** Per-unit or line total depending on the parent's `perUnit` flag. */
  price: string;
}

/** Fields accepted when building a row (everything but the generated `id`). */
export type ItemFields = Partial<Omit<Item, 'id'>>;

/** Factory that builds a blank/prefilled row with a fresh `id`. */
export type MakeRow = (fields?: ItemFields) => Item;

/** A line item parsed out of OCR'd receipt text. */
export interface ParsedLineItem {
  /** Leading integer quantity (defaults to 1). */
  units: number;
  desc: string;
  /** Last price token on the line — the total for all units. */
  lineTotal: number;
}

/** Selected state tax entry as held in form state. */
export interface StateTaxSelection {
  state: string;
  value: number | string;
}
