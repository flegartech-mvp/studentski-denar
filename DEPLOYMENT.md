# Deployment — Studentski Denar

Vite + React **local-first PWA** for student budgeting. Hash-based routing, offline service worker, optional Supabase cloud sync. Targets: **Vercel** or **Netlify** (static).

## Build / run
| Command | Purpose |
|---------|---------|
| `npm ci` | Clean install |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:unit` | Vitest (22 tests) |
| `npm run test:e2e` | Playwright e2e (needs `npx playwright install`) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve built `dist/` |

Node: 22+ (CI), verified on 24. Output: `dist`.

## Routing & PWA
- **Hash routing** (`#view`): the server only serves `/`, so **no SPA rewrite is needed**.
- Service worker at `/sw.js` (registered only in production). Both `vercel.json` and `netlify.toml` set `Cache-Control: no-cache` on `/sw.js` so clients pick up new builds.

## Vercel / Netlify
Config files included (`vercel.json`, `netlify.toml`): framework `vite`, build `npm run build`, output/publish `dist`. Import the repo and deploy.

## Environment variables (all OPTIONAL, all CLIENT-VISIBLE)
The app runs fully offline with none set. Every var is `VITE_`-prefixed and bundled into client JS — only public-safe values belong here.

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | optional | Supabase project URL for cloud sync |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | optional | Supabase anon/publishable key (public by design; protect data with RLS) |
| `VITE_APP_URL` | optional | Canonical app URL for auth redirects (defaults to `window.location.origin`) |
| `VITE_SUPPORTER_PUBLIC_KEY_PEM` | optional | Public licence-verification key (PEM, `\n` escaped). Never the private key. |

## Security notes
- Audit is clean (`npm audit` → 0 vulnerabilities; a dev-only Vite/launch-editor advisory was patched via `npm audit fix`).
- Licence verification uses a **public** key only; the private signing key lives outside the repo (`scripts/generate-keypair.mjs`).

## Known limitations
- Production bundle is a single ~140 kB gzip chunk (Vite warns >500 kB raw). Functional but could be code-split later; not a release blocker.
- Local-first: clearing browser data wipes local entries unless Supabase sync or backup export is used.
