# splitstupid — Design Spec

**Date:** 2026-06-05
**Status:** Approved (MVP)

## Purpose

A small web app that helps a person figure out how much they personally owe on a
shared/restaurant bill. The user enters the local tax rate, the tip they want to
pay, how the tip should be calculated, and the space-separated prices of the
items they got. The app computes and displays the total they owe.

This is the MVP. We can expand into more detail (e.g. multi-person splitting)
after this is working.

## Tech Stack

- **Vite + React** (JavaScript).
- pnpm, ES modules (`"type": "module"` already set in `package.json`).
- Single-page app. One component tree. No router, no backend, no persistence.
- State held in React `useState`.
- Plain CSS (single stylesheet). No UI/component library.
- **Vitest** for unit tests.

## Inputs (4)

1. **State Tax** — number input, interpreted as a percentage (e.g. `8.25` = 8.25%).
2. **Tip** — dropdown with options:
   - `5%`
   - `10%`
   - `15%`
   - `20%`
   - `WTF Are you Doing?`
3. **Tip Basis** — dropdown controlling what the tip is calculated on:
   - `Fair Mark Value` → tip calculated on the **pre-tax** subtotal.
   - `Oh we got duped again` → tip calculated on the **post-tax** amount (subtotal + tax).
4. **Your items** — free text input. Space-separated list of item prices
   (e.g. `12.50 8 4.25`).

## Output

A live result card that updates as inputs change, showing:

- Subtotal (sum of items)
- Tax amount
- Tip amount
- **Total owed** (visually emphasized — large, accent color)

Special case: when **Tip = `WTF Are you Doing?`**, the tip is `0` and the result
shows a celebratory message: **"Good job having principles 🎉"**.

## Calculation Logic

```
items     = parse space-separated tokens from the free-text input into numbers
subtotal  = sum(items)
taxAmt    = subtotal * (stateTax / 100)
tipBase   = (basis === "Fair Mark Value") ? subtotal : (subtotal + taxAmt)
tipPct    = (tip === "WTF Are you Doing?") ? 0 : selectedTipPercent
tipAmt    = tipBase * (tipPct / 100)
total     = subtotal + taxAmt + tipAmt
```

All money values displayed to 2 decimal places.

## Parsing / Edge Cases

- Split the free-text input on whitespace.
- Strip a leading `$` from each token.
- Parse each token as a number; silently drop anything that is not a valid,
  finite, non-negative number (garbage tokens ignored).
- Empty input → subtotal `0`, total `0`, no error.
- Negative or `NaN` tokens are ignored.

## Error Handling

- No hard errors. Invalid input is simply ignored.
- Optional: a faint hint shown if the items field has content but no valid
  numbers were found.

## Visual Design (beautiful + vibrant)

- **Background:** bold gradient (e.g. purple → pink → orange).
- **Card:** glassmorphism card centered on the page, rounded corners, soft
  shadows, smooth transitions on input and result changes.
- **Typography:** large friendly display font for the total; clean sans-serif
  for inputs and labels.
- **Result emphasis:** subtotal / tax / tip rows muted; **total owed** is large
  and punchy in an accent color.
- **Playful state:** the `WTF Are you Doing?` path swaps the result into a fun
  celebratory state ("Good job having principles 🎉").
- **Responsive:** mobile-first, single column, looks good on a phone (the real
  use case — splitting a bill at the table).
- **Animation:** subtle fade / count-up on the total when it changes.

## Architecture / Units

Keep calculation logic pure and separate from UI so it can be unit-tested
without a DOM:

- `parseItems(text) -> number[]` — tokenize + clean the free-text field.
- `calculate({ items, stateTax, tipPct, basis }) -> { subtotal, taxAmt, tipAmt, total }`
  — pure function implementing the calc logic above.
- React component(s) — render inputs, hold state, call `calculate`, render the
  result card. The `WTF` message is a UI concern driven by the selected tip.

## Testing

Vitest unit tests for the pure functions:

- `parseItems`: normal list, leading `$`, garbage tokens dropped, empty input,
  negatives ignored.
- `calculate`:
  - pre-tax tip basis (`Fair Mark Value`)
  - post-tax tip basis (`Oh we got duped again`)
  - `WTF` → tip is 0
  - empty items → all zeros

## Out of Scope (MVP)

- Multi-person splitting.
- Saving / sharing results.
- Currencies other than `$`.
- Backend / accounts.
