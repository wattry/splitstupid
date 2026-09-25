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
  /** How many of those units are mine. */
  yours: string;
  desc: string;
  /** Per-unit or line total depending on the parent's `perUnit` flag. */
  price: string;
  /** Ids of bill participants who had this row; absent means none. Labelling only. */
  assignees?: string[];
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

/** Whole-bill totals parsed out of OCR'd receipt text (absent = not found). */
export interface ParsedTotals {
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
}

/**
 * One itemised tax or fee. `amount` is the raw `<input>` string, like the
 * item rows; the label is free text ("Tax", "Service fee").
 */
export interface Fee {
  id: string;
  label: string;
  amount: string;
}

/** A person in this device's persisted friend list. */
export interface Friend {
  id: string;
  name: string;
}

/**
 * A person on the current bill. Same shape as a Friend but `name` is a
 * snapshot taken when they were added, so a shared link carries it without
 * needing the recipient to know the friend.
 */
export interface Participant {
  id: string;
  name: string;
}

/** This device's owner: a persisted id plus a name that may still be blank. */
export interface Me {
  id: string;
  name: string;
}
