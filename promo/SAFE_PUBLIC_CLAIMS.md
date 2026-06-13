# SAFE PUBLIC CLAIMS — Študentski Denar

## SAFE TO CLAIM

These are accurate, verifiable statements about what the product does:

1. **No account required** — the app works immediately on page load with zero registration or authentication steps.
2. **All data stored locally in the browser** — income, expense, and category data is saved in browser localStorage; nothing is transmitted to any server.
3. **No paid APIs or third-party services required** — the app runs entirely on static files with no runtime backend dependencies.
4. **Built with React 19, TypeScript, Vite, and Tailwind CSS** — the tech stack is accurate and verifiable from the codebase.
5. **Deploys to Cloudflare Pages** — the deployment target is configured and documented.
6. **Includes spending analytics with visual charts** — category pie charts and bar charts are implemented features.
7. **Supporter license system uses offline verification** — license validation does not make network requests; it verifies a signed token locally.
8. **Playwright tests are included and pass** — automated end-to-end tests exist in the repository.

---

## DO NOT CLAIM

Avoid these statements — they are unverified, exaggerated, or potentially misleading:

1. **"Used by X students" or any user/download count** — no usage metrics exist; do not invent or imply adoption numbers.
2. **"The best budget app for students"** — superlative claims require evidence; this is marketing language without a factual basis.
3. **"Bank-level security"** — localStorage is not encrypted and is accessible to any JavaScript on the same origin; this phrase would be misleading.
4. **"Supabase features are fully implemented and production-ready"** — Supabase integration is listed as optional; do not present cloud sync as a fully shipped feature without confirming its state.
5. **"Works offline as a PWA"** — unless a service worker and PWA manifest are confirmed implemented, do not claim offline-first or installable app capabilities.
