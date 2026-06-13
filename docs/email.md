# Email

## What Exists Now

For this Vite frontend stage, email is handled by Supabase Auth:

- account verification email
- password reset email
- email change confirmation, if enabled in Supabase

The frontend does not send promotional email and does not use provider API keys.

## Supabase Auth Templates

Configure built-in auth email templates in the Supabase Dashboard under Authentication email templates.

Recommended links:

- Confirm signup: `{{ .ConfirmationURL }}`
- Reset password: set the recovery redirect to `/#reset-password`
- Change email: use the Supabase-provided confirmation link

Keep copy short, clear, and account-focused.

## Future Transactional Email

Payment/supporter messages, receipts, support notices, and lifecycle messages should be sent server-side only.

Recommended providers:

- Resend
- Postmark
- SendGrid

Recommended server runtime:

- Supabase Edge Function

The server-side function should:

- read provider secrets from Edge Function secrets
- use the Supabase service role key only on the server
- write send attempts to `email_events`
- avoid exposing whether a user email exists
- rate-limit sensitive flows

## Future Promotional Email

Promotional or product-update email requires explicit consent.

Rules:

- send only to users with `profiles.marketing_consent = true`
- include an unsubscribe link or clear account setting path
- update `marketing_consent` to false when the user unsubscribes
- log sends, skips, and failures in `email_events`
- never send bulk/promotional messages directly from frontend code

## Why Frontend Must Not Send Bulk Email

Provider API keys and Supabase service role keys can approve privileged operations. Putting them in browser code would expose them to every user. Bulk email must run on a trusted server path with consent checks, auditing, and rate limits.
