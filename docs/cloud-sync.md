# Cloud Sync

Studentski Denar remains local-first. Local data is still stored in `localStorage` under `studentski-denar:v1`, and JSON export/import remains the safest backup format.

Cloud sync is optional and available only for logged-in Supabase users.

## Logged-Out Behavior

Logged-out users stay local-only:

- no Supabase budget sync
- no cloud reads or writes
- localStorage continues to work
- JSON export/import continues to work

## Logged-In Behavior

Logged-in users see a Cloud Sync card in Settings. Sync is manual:

- Upload local data to cloud
- Download cloud data to this device
- Merge local and cloud data
- Export backup first

The app does not automatically overwrite local data on login.

## Upload vs Download vs Merge

Upload local data to cloud:

- converts the current local app data into Supabase rows
- replaces existing cloud transaction and recurring rows for that user
- stores a full local app snapshot in `budget_profiles.settings.app_data`

Download cloud data to this device:

- reads cloud rows
- restores the stored app snapshot when available
- replaces local data only after the user clicks the action

Merge local and cloud data:

- keeps items with different IDs
- for same-ID conflicts, explicit merge helpers can use `updated_at`
- uploads the merged result back to cloud

## Conflict Strategy

Conflict handling is intentionally simple:

- no real-time collaboration
- no automatic multi-device conflict resolution
- no silent local or cloud overwrite
- different transaction/recurring IDs are kept
- same-ID conflicts can resolve by newest `updated_at` only during explicit merge

## Data Safety Rules

- Local storage is never removed by cloud sync.
- Export backup is shown next to sync actions.
- Destructive actions use clear warnings.
- Malformed cloud rows are normalized or skipped.
- Old local backup/import schema remains supported.
- Logged-out users never sync budget data.

## Supabase Tables

`budget_profiles`

- one row per user
- stores high-level estimates and `settings`
- stores the full app snapshot at `settings.app_data`

`budget_transactions`

- stores income and expense rows
- uses `text` IDs to preserve existing local IDs like `income-...` and `expense-...`

`recurring_expenses`

- stores recurring cost rows
- uses `text` IDs to preserve existing local IDs like `recurring-...`

`sync_metadata`

- stores last sync, pull, and push timestamps
- stores whether a local backup should be recommended

## RLS Policies

All sync tables have RLS enabled.

Users can:

- select only their own rows
- insert only rows with `user_id = auth.uid()`
- update only their own rows
- delete only their own rows

No service role key is used in frontend code.

## Limitations

- Sync is manual, not real-time.
- The full app snapshot is the safest restore source; row-level tables also support future reporting/migration.
- Roommates and shared bills are preserved in the snapshot, not represented as first-class sync tables yet.
- Upload replaces cloud transaction/recurring rows for the current user after explicit confirmation.
