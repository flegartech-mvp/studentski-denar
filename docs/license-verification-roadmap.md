# License Verification Roadmap

## Current MVP

Supporter access is verified manually:

- user supports through PayPal
- user sends a transaction ID/message
- developer manually checks PayPal
- developer generates a signed license token
- frontend verifies the token with a public key

This is honest and cheap for MVP, but it is frontend-only and bypassable by technical users.

## Secure Future Path

Use a Cloudflare Worker as the server-side authority.

1. Store the private license signing key only in Cloudflare Worker secrets.
2. Keep the public verification key in the frontend.
3. Add either:
   - PayPal webhook approval, or
   - an admin-only manual approval endpoint.
4. Worker validates/approves payment.
5. Worker signs a supporter license token containing:
   - email hash or user identifier
   - tier
   - issued timestamp
   - expiry timestamp or lifetime flag
6. Frontend stores only the signed token and verifies its public signature locally.

## Privacy Rules

- Do not store sensitive PayPal data in browser storage.
- Do not claim automatic verification until the Worker/webhook exists.
- Keep copy honest: supporter access, premium unlock, one-time unlock.
- Do not call gated access a donation.

## Why Not Now

The product is still an MVP. Manual supporter access is enough for early validation. Real enforcement requires a server-side authority and should wait until people actually use/pay for the app.
