# Auth

Studentski Denar uses Supabase Auth in the Vite + React frontend when these variables are configured:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

The publishable key is safe to ship to the browser. Never expose a Supabase service role key in frontend code.

## Flow

- Register uses `supabase.auth.signUp()` with email, password, display name metadata, and explicit marketing consent metadata. The UI shows "Check your email to verify your account" after a successful request.
- Login uses `supabase.auth.signInWithPassword()`.
- Logout uses `supabase.auth.signOut()`.
- Forgot password uses `supabase.auth.resetPasswordForEmail()` and always uses non-enumerating success copy.
- Reset password and change password use `supabase.auth.updateUser({ password })`.
- Profile reads `profiles`, displays email, display name, marketing consent, supporter status, and account actions.

## Auth State

`src/hooks/useAuth.ts` loads the current Supabase session on app start, subscribes to `onAuthStateChange`, and exposes:

- `user`
- `session`
- `profile`
- `supporterAccess`
- `loading`
- `signOut`
- `refreshProfile`

The hook also ensures a profile row exists as a client fallback if the SQL trigger has not run yet.

## Route Guards

Hash routing is kept. When Supabase is configured, logged-out users may access:

- `/#supporter`
- `/#privacy`
- `/#login`
- `/#register`
- `/#forgot-password`
- `/#reset-password`

Logged-out users who open protected app routes are sent to `/#login`. The app stores a simple intended destination and returns there after login when possible.

When Supabase is not configured, the app keeps the local MVP mode so development and offline budgeting flows continue to work. That mode is not real auth.

## Profile Table

`profiles` stores the auth user id, email, display name, and marketing consent. Users can read their own profile and update only `display_name` and `marketing_consent`.

## Supporter Table

`supporter_access` stores the database-backed supporter state for logged-in users. The frontend can read the current user's rows. It cannot set `active`, `expiring_soon`, or `expired`.

Users submit PayPal/manual references through `submit_supporter_request()`, which creates a `pending` row. Approval remains a server/admin action.

## RLS

The migration enables RLS on:

- `profiles`
- `supporter_access`
- `email_events`

Policies restrict reads to the current user. Column grants on `profiles` limit client updates to display name and marketing consent. `supporter_access` has no direct client update grant.

## Limitations

- Budget data is still local app data. Auth and supporter state are database-backed.
- Supporter approval is manual until a server-side payment verification flow is added.
- Custom transactional/promotional email is documented for later and must run server-side only.
