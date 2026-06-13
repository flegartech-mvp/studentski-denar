# Študentski Denar

Browser-first budgeting app for Slovenian students. Data stays in the user's browser, with no paid APIs, no AI APIs, no accounts, and no required backend.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm run test
npm run test:e2e
npm run test:e2e:ui
```

If Playwright browsers are missing on a new machine, run:

```bash
npx playwright install chromium
```

Cloudflare Pages build settings:

- Build command: `npm run build`
- Output directory: `dist`

## Supporter Licenses

The frontend verifies signed licenses with a public key. Keep the private key outside `src/` and do not commit it. Files ending in `.local.pem` are ignored.

Create your own keypair before real payments:

```bash
npm run license:keypair
```

The command writes `private-key.local.pem` and prints a `VITE_SUPPORTER_PUBLIC_KEY_PEM=...` line. Put that line in `.env.local` locally and in Cloudflare Pages environment variables before deploying.

```bash
npm run license:generate -- --email ana@example.com --tier supporter --expires 2027-05-04 --key ./private-key.local.pem
npm run license:generate -- --email ana@example.com --tier lifetime --lifetime --key ./private-key.local.pem
```

Payment wording should stay honest: use "supporter access", "premium unlock", "one-time unlock", or "monthly supporter". Do not call gated access a donation.

## Privacy And Legal Copy

The app is a practical student budgeting tool, not tax, legal, or accounting advice. PayPal payments and online income may create reporting obligations; users are responsible for their own obligations.

## MVP Features

- First-open onboarding that pre-fills a useful student budget.
- Survival Mode with real projected balance, daily safe spend, unpaid recurring costs, and calm suggestions.
- Slovenian student categories for income and expenses.
- Mobile quick expense entry, recent templates, and repeat-last-expense.
- Recurring expenses can be marked paid/unpaid for the active month.
- Manual supporter/license flow with status and PayPal message template.
- Privacy page and backup reminder.

See `FUTURE.md` for storage migration and bundle-size notes.

---

Made by FlegarTech. If this project helped you, you can [support development](https://paypal.me/TiniFlegar).
