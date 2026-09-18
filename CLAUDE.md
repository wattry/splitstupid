# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is pnpm.

- `pnpm dev` — Vite dev server (localhost:5173)
- `pnpm build` — production build to `dist/` (also writes `dist/bundle-stats.html`)
- `pnpm test` — run all tests (Vitest, jsdom)
- `pnpm vitest tests/lib/calculate.test.ts` — run a single test file
- `pnpm lint` / `pnpm lint:fix` — ESLint over `src/**/*.ts` (config in `eslint.config.ts`)
- `pnpm typecheck` — `tsc --noEmit`

Worker (in `worker/`): deploy with `wrangler deploy`; secrets set via `wrangler secret put IPSTACK_KEY` and `wrangler secret put TABSCANNER_KEY`.

## Architecture

Single-page React 19 bill-splitting app (no router, no server-rendered code). Two deployables:

1. **Frontend** — Vite static site. Entry `src/main.tsx` → `src/App.tsx`, which owns all form state (subtotal, tax, tip, item rows, per-unit toggle) and passes it down. Pure calculation logic lives in `src/lib/` and is what the tests in `tests/lib/` cover.
2. **CORS proxy** — Cloudflare Worker in `worker/src/index.js`. The static site can't hold secrets or add CORS headers, so the worker forwards a fixed allowlist of routes (`/ipstack`, `/tabscan/process`, `/tabscan/result/:id`) to upstream APIs, injecting secret keys server-side. It is deliberately NOT an open proxy; allowed origins are in `worker/wrangler.toml` (`ALLOWED_ORIGINS`).

### Receipt scan flow

Upload or camera capture (`CameraCapture.tsx`) → crop (`CropImage.tsx`, react-easy-crop) → OCR → parse line items (`src/lib/parseLineItems.ts`) → replace item rows in `App`. Two OCR backends exist in `src/lib/`:
- `ocr.ts` — in-browser tesseract.js. Dynamically imported so the wasm/lang assets stay out of the main bundle (fetched from CDN on first scan). Preprocesses (upscale, grayscale, contrast) and uses PSM 6 / 300 DPI.
- `tabscan.ts` — TabScanner API client (POST image for token, poll for result), reached through the worker proxy.

### Calculation model

`src/lib/calculate.ts`: tax and tip are entered as whole-bill dollar totals; their ratios against the whole-bill subtotal are applied to this user's share (sum of their owed line items). `ItemRows.tsx` exports `rowOwed(item, perUnit)` for the per-row share. The `perUnit` toggle changes whether the Price column means per-unit or total-for-all-units; toggling converts stored prices so amounts owed stay constant.

### Conventions

- TypeScript ESM throughout; relative imports use explicit `.js` extensions even in `.tsx`/`.ts` files.
- Client env vars are Vite-style (`VITE_TAB_SCAN_KEY`, `VITE_SPLIT_WISE_KEY`, `VITE_SPLIT_WISE_SECRET`), loaded via dotenv in `vite.config.ts`.
- Manual chunk splitting in `vite.config.ts`: `react-vendor`, `observability` (PostHog), `image-processing` (tesseract, crop/zoom libs). Keep heavy new deps in a matching chunk or dynamically import them.
- Tests live in `tests/` (mirroring `src/lib/`), not next to source; Vitest globals are enabled and setup is `tests/setup.ts`.
