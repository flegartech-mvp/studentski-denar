# Architecture

## Overview

Študentski Denar is a local-first React/Vite app for Slovenian student budgeting. It can run without a backend and keeps budget data in the browser by default.

## Routing

Routing uses URL hashes such as `#dashboard`, `#expenses`, and `#privacy`. Unknown hashes render the Not Found page without clearing user data.

## Storage

The app stores one JSON document in `localStorage` under `studentski-denar:v1`. The storage layer has an in-memory fallback for private-mode or quota failures. Import/export uses JSON backup files.

## Auth And Cloud Sync

Supabase Auth is optional at runtime. When configured, logged-in users can manually sync budget data to Supabase from Settings.

Cloud sync is deliberately manual:

- no sync for logged-out users
- no automatic overwrite on login
- upload, download, and merge are explicit actions
- JSON export/import remains available before sync operations

Sync code lives in:

- `src/lib/cloudSync.ts`
- `src/lib/syncMerge.ts`
- `src/lib/supabaseBudget.ts`
- `src/hooks/useCloudSync.ts`

The database tables are `budget_profiles`, `budget_transactions`, `recurring_expenses`, and `sync_metadata`, all protected by per-user RLS.

## Finance Logic

Pure finance calculations live in `src/lib/finance.ts`:

- monthly income and expense totals
- recurring paid/unpaid projection
- Survival Mode balance and daily spend
- recommendations
- roommate settlements

Money parsing and formatting live in `src/lib/money.ts`; local date helpers live in `src/lib/date.ts`.

## UI Structure

`src/App.tsx` owns top-level app state, hash routing, persistence, and page rendering. Page-level UI has been moved to `src/pages/AppPages.tsx`, with chart code lazy-loaded from `src/components/Charts.tsx`.

## License Model

The MVP uses manual PayPal supporter verification and signed license tokens. The frontend verifies a public signature only. This is intentionally lightweight and can be bypassed by technical users; it is supporter access, not strong DRM.

## Tests

- Unit tests: `tests/unit/finance.test.ts`, `tests/unit/cloud-sync.test.ts`
- E2E smoke tests: `tests/e2e/smoke.spec.ts`
- Cloud sync E2E tests: `tests/e2e/cloud-sync.spec.ts`
- Mobile visual/layout screenshots: `tests/e2e/visual.spec.ts`

## Deployment

Build command: `npm run build`

Output directory: `dist`

Cloudflare Pages remains the recommended zero-cost hosting target.

## Known Limitations

- `App.tsx` still owns all mutation handlers.
- Cloud sync is manual and does not implement real-time multi-device collaboration.
- The chart chunk remains heavy because Recharts is still used, but it is lazy-loaded.
