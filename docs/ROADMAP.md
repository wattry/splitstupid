# Split Stoopid roadmap

Source of truth for planned work. Work items are `SS-n`. Update the Status column in the same PR that changes an item, and move finished items to the Shipped log.

## How to work this list

- **Order:** functional work first, look and feel last. Work top to bottom through "Next up" unless told otherwise.
- **One item per PR.** Branch name `ss-<n>-<slug>`; PR title starts with `SS-<n>:`.
- **Every PR:** add tests that fail before the change and pass after; `pnpm typecheck`, `pnpm lint` (0 errors), `pnpm test --run` and `pnpm build` must pass.
- **Ask before deciding** anything listed under "Open questions".

## Status

| ID | Item | Priority | Status |
| --- | --- | --- | --- |
| SS-16 | Bug: By person leaves out each person's fees and tip | P1 | In review (#20) |
| SS-2 | PostHog may record the `#s=` bill payload | P0 | Next up |
| SS-4 | No guard when a share link gets too long | P1 | Open |
| SS-3 | Raw OCR text inflates share links | P1 | Open |
| SS-15 | Undo toast for every removal | P1 | Open |
| SS-1 | Share links are compressed, not encrypted | P0 | Needs decision |
| SS-5 | OCR fails offline: Tesseract assets not cached | P1 | Open |
| SS-7 | Move hosting to Cloudflare, make repo private | P1 | Open (owner does account setup) |
| SS-6 | Service worker cache version bumped by hand | P2 | Open |
| SS-12 | Tailwind v4 migration, zero visual change (Part A) | P1 | After functional items |
| SS-9 / SS-10 / SS-11 | Buttons, modals, chips enhancements (Part B) | P1 | After SS-12 |

## Functional items

### SS-8 Shared-link recipients see the sender's Mine column (P0)

Cause: `yours` travels in the link as the sender's value and nothing recomputes it. On load, `pruneAssignees` leaves `yours` alone. `adoptIdentity` (`src/lib/me.ts`) calls `setAssignees(it, remapped)` without `meId`, so Mine is never recomputed. Also, `ensureMe` on link load adds the recipient as a phantom extra participant.

Agreed design:

1. `encodeState` writes `'0'` for every row's `yours`; assignments are kept. Link format stays v1.
2. `decodeState` also zeroes `yours` (old links still carry sender values).
3. On load: if the recipient's `me.id` is already on the bill (sender reopening their own link), skip the prompt and recompute. Otherwise do not call `ensureMe`; set `claimPending`.
4. While pending: a banner above the chips, "Who are you? Tap your name." Chips claim in one tap plus a confirm. An "I'm not on this bill" chip adds the recipient as a new participant and dismisses the prompt. The owed total reads "Pick your name to see your share". Use current styling; the restyle is SS-11.
5. Claim runs `adoptIdentity`, then a new `deriveMine(items, meId, onBill)` in `src/lib/assign.ts`: for each row with on-bill assignees, `yours = mineShare(units, sharers)` if `meId` is on the row, else 0.
6. Omit Split Even `m` (my party) from links; the recipient picks their own.

Accepted side effect: claiming permanently switches this device's Me id to the one in the link.

Split Even links: every row's Mine is set to its units on load (as turning Split Even on does) and claiming does not derive it, so the even split works before and after a claim.

Tests: encode emits `yours: '0'` with assignees intact; decode of an old link zeroes Mine; foreign `me.id` sets `claimPending` and adds no Me; claiming B gives Mine 1 on B's rows and 0 elsewhere; own-link reload skips the prompt.

### SS-16 By person leaves out each person's fees and tip (P1)

By person listed only item amounts per person, so everyone's total there was short of what they owe. Each person (and Unassigned) now gets a line per fee, by label, plus Tip, in proportion to their items and using the same whole-bill Sub Total ratios as the owed total. The group totals and the section total include them. With a Sub Total, a Bill total row (Sub Total + fees + tip) sits under the section total, with "Off by $X" when they differ. Shared rows, fees and tip are split in whole cents (leftover cents to people in bill order) so the shares always add up; "Off by" only shows a real gap, such as items that don't reach the Sub Total.

### SS-2 PostHog may record the `#s=` payload (P0)

`main.tsx` initializes PostHog before `App`'s effect strips the hash, so the first `$pageview` likely includes the full bill in `$current_url`. Fix: read and strip `location.hash` in `main.tsx` before `render` and pass the payload into `App`; add a `before_send` hook that drops URL fragments from `$current_url` and `$referrer`; mask inputs in session replay. Test that `App` never sees `#s=` in `location.href` after mount.

### SS-4 No guard when a link gets too long (P1)

Measure the share URL before sharing; warn past about 2,000 characters. When `decodeState` returns null, show "This link is incomplete" instead of a silent blank form.

### SS-3 Raw OCR text inflates links (P1)

The payload's `r` field carries full OCR text. Omit it from links by default; add an opt-in "Include scan text".

### SS-15 Undo toast for every removal (P1)

Decided: undo, never confirm. Every destructive action acts immediately and shows a toast with Undo for about 6 seconds: remove row, fee or photo; Delete all items; Remove from bill; Delete friend; discarding a typed draft.

- `useUndo` stores the inverse of the last removal (removed rows with their indices, removed participant with their assignments, deleted friend), not a whole-bill snapshot, so edits made during the window survive.
- One level deep: a new removal commits the previous one. Building a share link commits any pending removal.
- One toast component with `aria-live`; also used for "Link copied" and "Shared".
- Log `undo_used` to PostHog with the action name.
- Also rename the ambiguous buttons now: bottom "Clear" becomes "Delete all items"; bulk-bar "Clear" becomes "Deselect"; bulk-bar "Select" becomes "Assign to...".

### SS-1 Share links are compressed, not encrypted (needs decision)

`shareLink.ts` deflates and base64url-encodes; anyone with the link can read it. Options: AES-GCM with the key in the same link (little real protection), an optional passphrase (PBKDF2 plus AES-GCM, shared out of band), or keep compression and say "anyone with the link can see this bill" in the share UI. Do not implement until the owner picks one.

### SS-5 OCR fails offline (P1)

Tesseract worker, WASM core and language data load from a CDN, and `sw.js` skips cross-origin requests. Self-host under `/tesseract/` via `workerPath`, `corePath` and `langPath`, and runtime-cache them in the service worker.

### SS-7 Move hosting to Cloudflare (P1)

Decided: Cloudflare Workers static assets, deployed from GitHub Actions with `pnpm exec wrangler deploy`.

- Add `wrangler` as a dev dependency and `wrangler.jsonc`: `name: "splitstupid"`, `assets.directory: "./dist"`, `assets.not_found_handling: "single-page-application"`.
- Workflow job uses a `production` environment; secret `CLOUDFLARE_API_TOKEN`, variable `CLOUDFLARE_ACCOUNT_ID`; permissions `contents: read` only; runs tests before deploying.
- `public/.assetsignore` containing `bundle-stats.html` (it lists every source module).
- `public/_headers`: `Cache-Control: no-cache` for `/sw.js`; `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(self), microphone=(), geolocation=()`, `X-Content-Type-Options: nosniff` for `/*`.
- Owner-only steps (do not attempt): create the API token, move DNS, attach the custom domain, delete `public/CNAME`, disable GitHub Pages, make the repo private, rotate the old TabScanner key if it was ever deployed.

### SS-6 Service worker cache version (P2)

`CACHE = 'splitstupid-v2'` is bumped by hand. Inject a build hash via a small Vite plugin, or move to vite-plugin-pwa.

## Look and feel (after the functional items)

Two parts, strictly in order.

### Part A: SS-12 Tailwind v4 port with zero change

The app must look and behave exactly as today.

1. **Prep:** switch the 13 test files that query CSS classes to role and label queries; add Playwright `toHaveScreenshot()` baselines at 390px and 1280px for every screen and open state; freeze `styles.css`.
2. **Install:** `tailwindcss` and `@tailwindcss/vite`. Create `src/app.css` with `@layer theme, base, legacy, components, utilities;`, import Tailwind's `theme.css` and `utilities.css`, and import `styles.css` with `layer(legacy)`. Unlayered CSS beats layered CSS, so without the legacy layer the old stylesheet overrides every utility. Preflight stays off. Define tokens in `@theme`: brand `#7b2ff7`, brand-2 `#f107a3`, accent `#ff2e88`, ink `#1b1033`, muted `#6b5b8a`, danger `#c2185b`.
3. **Primitives:** `Button`, `IconButton`, `Modal`, `Chip`, `Field`, `Switch`, `Card`, using `class-variance-authority` and `tailwind-merge`. Variants reproduce today's classes exactly (`gradient`, `ghost`, `camera`, `danger`, `outline`, `tint`, `flat`, `chip-action`). `Modal` keeps each dialog's current close behavior.
4. **Migrate** one group per PR, deleting its CSS: app shell; totals and share; money inputs; small modals; participants; scan flow; item rows last.
5. **Cleanup:** delete `styles.css`; Preflight only if zero-diff; `prettier-plugin-tailwindcss`; lint rule banning raw hex colors.

Gate for every Part A PR: zero screenshot diffs. Never re-baseline in Part A. Log anything that should change as a new item instead of changing it.

### Part B: SS-9, SS-10, SS-11 enhancements

One PR per step, screenshots re-approved deliberately:

1. **SS-9 buttons:** collapse variants into primary (gradient, one per surface), secondary (brand tint), tertiary (text only), destructive (red outline and red text, acts immediately with Undo).
2. **SS-10 modals:** native `<dialog>` with `showModal()`; × in the header of every modal; Escape and backdrop close; focus returns to the opener.
3. **SS-11 chips:** 32px fixed-size pill with initials avatar; stable hue per participant id shared with item-row pills; filled "You" chip; options in a bottom sheet instead of inside the chip; dashed pulsing claim state for SS-8.
4. **Polish:** `prefers-reduced-motion`, 44px touch targets, visible tap equivalents for swipe actions.

## Open questions (ask the owner)

- SS-1: which link-privacy option?
- "My Party" defaults to 2. Should it default to 1?
- Dark mode: add to the list or not?

## Shipped log

| ID | Date | PR | Notes |
| --- | --- | --- | --- |
| SS-14 | 2026-09-26 | #17 | Inlined tsconfig and ESLint base configs; dropped GitHub Packages auth. |
| SS-13 | 2026-09-26 | #18 | Party Size follows the head count until typed over. |
| SS-8 | 2026-09-26 | #19 | Links drop Mine and My Party; recipients claim their name. |
