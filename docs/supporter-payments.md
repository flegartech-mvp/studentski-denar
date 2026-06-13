# Supporter Payments

The app uses manual PayPal verification. It does not pretend to verify PayPal automatically.

## User Flow

1. User registers or logs in.
2. User opens `/#supporter`.
3. User follows PayPal/support instructions.
4. User submits a safe payment reference, such as a transaction ID.
5. The app calls `submit_supporter_request`.
6. The database stores a `supporter_access` row with `status = pending`.
7. Admin manually verifies PayPal outside the frontend.
8. Admin approves access with trusted database/server credentials.
9. Supporter-only features unlock from database status.

## Security

- Users cannot update `supporter_access` directly.
- Users cannot make themselves `active`.
- The frontend signed-license flow remains only a local/dev fallback for logged-out users.
- Sensitive payment data is not stored. Store only safe references.
- Service role credentials must stay server-side and are not part of the Vite app.

## Manual Approval SQL

After verifying the payment, an admin can insert a trusted row from the Supabase SQL editor:

```sql
insert into public.supporter_access (
  user_id,
  status,
  plan_name,
  starts_at,
  expires_at,
  payment_provider,
  payment_reference
) values (
  'USER_UUID',
  'active',
  'supporter unlock',
  now(),
  '2027-05-05T00:00:00.000Z',
  'paypal_manual',
  'PAYPAL_TXN_ID'
);
```

## Future PayPal Webhook

A future webhook can replace manual approval:

- receive PayPal webhook server-side
- verify PayPal signature
- match payment to user/supporter request
- insert an active `supporter_access` row
- send supporter-approved email server-side

Frontend-only license checks are not secure because users control browser state. Database-backed status with RLS is the real source for logged-in users.
