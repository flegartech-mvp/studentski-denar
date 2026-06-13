# Future Improvements

## Storage

- The app now has a small `storage` abstraction around `localStorage`.
- Keep existing localStorage data compatible.
- Move to IndexedDB only when history grows enough to justify it.
- Before any migration, keep JSON export/import working and recommend users export a backup.

## Bundle Size

Current production build works, but Vite warns that the main JS chunk is larger than 500 kB. The obvious safe wins are:

- Lazy-load the Insights page.
- Lazy-load Recharts only when opening Insights/Dashboard charts.
- Replace chart library usage with smaller custom charts if bundle size becomes a real issue.
- Keep icon imports named, as they are now.

## Payments

- Manual PayPal verification is intentionally simple for MVP.
- A future version can use a free Cloudflare Worker endpoint for supporter verification.
- Keep the private license signing key only in the Worker environment, never in frontend code.
- PayPal can call a webhook, or an admin-only/manual approval screen can issue licenses after checking a transaction.
- The Worker should return a signed license token.
- The frontend should keep doing what it does now: verify the public signature only.
- Keep wording honest: supporter access, premium unlock, one-time unlock. Do not call gated features donations.
