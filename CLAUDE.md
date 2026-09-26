# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Roadmap

Planned work lives in `docs/ROADMAP.md` (items `SS-n`). Read it before starting work, follow its PR rules, and update its Status table and Shipped log in the same PR.

## Commands

Package manager is pnpm.

- `pnpm dev` — Vite dev server (localhost:5173)
- `pnpm build` — production build to `dist/` (also writes `dist/bundle-stats.html`)
- `pnpm test` — run all tests (Vitest, jsdom)
- `pnpm vitest tests/lib/calculate.test.ts` — run a single test file
- `pnpm lint` / `pnpm lint:fix` — ESLint over `src/**/*.ts` (config in `eslint.config.ts`)
- `pnpm typecheck` — `tsc --noEmit`


## Architecture

Single-page React 19 bill-splitting app (no router, no server-rendered code, no backend). Vite static site. Entry `src/main.tsx` → `src/App.tsx`, which owns all form state (subtotal, tax, tip, item rows, per-unit toggle) and passes it down. Pure calculation logic lives in `src/lib/` and is what the tests in `tests/lib/` cover.

### Receipt scan flow

Upload (multiple) or camera capture (`CameraCapture.tsx`, stays open for several shots) → up to 9 photos in a thumbnail grid in `ScanReceipt.tsx` → optional per-photo crop (`CropImage.tsx`, react-easy-crop, returns a pixel `Area`) → `src/lib/scanPhotos.ts` OCRs each photo in order and merges line items (`parseLineItems.ts`) and totals (`parseTotals.ts`, first photo wins per field) → replace item rows in `App`. OCR is `src/lib/ocr.ts`: in-browser tesseract.js. Dynamically imported so the wasm/lang assets stay out of the main bundle (fetched from CDN on first scan). Preprocesses (upscale, grayscale, trim margins, contrast), then runs two tesseract passes (PSM 4 single column and PSM 6 single block) at 300 DPI and keeps the one with more priced lines (`ocrScore.ts`): PSM 4 can drop a right-hand price column, PSM 6 reads background texture as words.

### Calculation model

`src/lib/calculate.ts`: tax and tip are entered as whole-bill dollar totals; their ratios against the whole-bill subtotal are applied to this user's share (sum of their owed line items). `ItemRows.tsx` exports `rowOwed(item, perUnit)` for the per-row share. The `perUnit` toggle changes whether the Price column means per-unit or total-for-all-units; toggling converts stored prices so amounts owed stay constant.

### Conventions

- TypeScript ESM throughout; relative imports use explicit `.js` extensions even in `.tsx`/`.ts` files.
- Client env vars are Vite-style (`VITE_POSTHOG_KEY`), loaded via dotenv in `vite.config.ts`.
- Manual chunk splitting in `vite.config.ts`: `react-vendor`, `observability` (PostHog), `image-processing` (tesseract, crop/zoom libs). Keep heavy new deps in a matching chunk or dynamically import them.
- Tests live in `tests/` (mirroring `src/lib/`), not next to source; Vitest globals are enabled and setup is `tests/setup.ts`.
