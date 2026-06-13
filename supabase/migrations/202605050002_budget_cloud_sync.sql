create table if not exists public.budget_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  monthly_income_estimate numeric,
  rent numeric,
  transport numeric,
  food_estimate numeric,
  roommates boolean,
  current_balance numeric,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_profiles_one_per_user unique (user_id)
);

create table if not exists public.budget_transactions (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  category text,
  description text,
  date date not null,
  source text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_expenses (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  amount numeric not null,
  category text,
  due_day integer check (due_day is null or (due_day >= 1 and due_day <= 31)),
  paid_months text[] not null default '{}',
  active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_metadata (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_sync_at timestamptz,
  last_pull_at timestamptz,
  last_push_at timestamptz,
  local_backup_recommended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists budget_profiles_user_id_idx on public.budget_profiles(user_id);
create index if not exists budget_transactions_user_id_idx on public.budget_transactions(user_id);
create index if not exists budget_transactions_date_idx on public.budget_transactions(user_id, date desc);
create index if not exists budget_transactions_type_idx on public.budget_transactions(user_id, type);
create index if not exists recurring_expenses_user_id_idx on public.recurring_expenses(user_id);

drop trigger if exists budget_profiles_touch_updated_at on public.budget_profiles;
create trigger budget_profiles_touch_updated_at
before update on public.budget_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists budget_transactions_touch_updated_at on public.budget_transactions;
create trigger budget_transactions_touch_updated_at
before update on public.budget_transactions
for each row execute function public.touch_updated_at();

drop trigger if exists recurring_expenses_touch_updated_at on public.recurring_expenses;
create trigger recurring_expenses_touch_updated_at
before update on public.recurring_expenses
for each row execute function public.touch_updated_at();

drop trigger if exists sync_metadata_touch_updated_at on public.sync_metadata;
create trigger sync_metadata_touch_updated_at
before update on public.sync_metadata
for each row execute function public.touch_updated_at();

alter table public.budget_profiles enable row level security;
alter table public.budget_transactions enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.sync_metadata enable row level security;

grant select, insert, update, delete on public.budget_profiles to authenticated;
grant select, insert, update, delete on public.budget_transactions to authenticated;
grant select, insert, update, delete on public.recurring_expenses to authenticated;
grant select, insert, update, delete on public.sync_metadata to authenticated;

drop policy if exists "budget profiles select own" on public.budget_profiles;
create policy "budget profiles select own"
on public.budget_profiles for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "budget profiles insert own" on public.budget_profiles;
create policy "budget profiles insert own"
on public.budget_profiles for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "budget profiles update own" on public.budget_profiles;
create policy "budget profiles update own"
on public.budget_profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "budget profiles delete own" on public.budget_profiles;
create policy "budget profiles delete own"
on public.budget_profiles for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "budget transactions select own" on public.budget_transactions;
create policy "budget transactions select own"
on public.budget_transactions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "budget transactions insert own" on public.budget_transactions;
create policy "budget transactions insert own"
on public.budget_transactions for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "budget transactions update own" on public.budget_transactions;
create policy "budget transactions update own"
on public.budget_transactions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "budget transactions delete own" on public.budget_transactions;
create policy "budget transactions delete own"
on public.budget_transactions for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "recurring expenses select own" on public.recurring_expenses;
create policy "recurring expenses select own"
on public.recurring_expenses for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "recurring expenses insert own" on public.recurring_expenses;
create policy "recurring expenses insert own"
on public.recurring_expenses for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "recurring expenses update own" on public.recurring_expenses;
create policy "recurring expenses update own"
on public.recurring_expenses for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "recurring expenses delete own" on public.recurring_expenses;
create policy "recurring expenses delete own"
on public.recurring_expenses for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "sync metadata select own" on public.sync_metadata;
create policy "sync metadata select own"
on public.sync_metadata for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "sync metadata insert own" on public.sync_metadata;
create policy "sync metadata insert own"
on public.sync_metadata for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "sync metadata update own" on public.sync_metadata;
create policy "sync metadata update own"
on public.sync_metadata for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "sync metadata delete own" on public.sync_metadata;
create policy "sync metadata delete own"
on public.sync_metadata for delete
to authenticated
using (auth.uid() = user_id);
