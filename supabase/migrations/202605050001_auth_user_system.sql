create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supporter_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'free' check (status in ('free', 'pending', 'active', 'expiring_soon', 'expired')),
  plan_name text not null default 'free',
  starts_at timestamptz,
  expires_at timestamptz,
  payment_provider text,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  type text not null,
  status text not null check (status in ('sent', 'failed', 'skipped', 'mocked')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists supporter_access_user_id_idx on public.supporter_access(user_id);
create index if not exists email_events_user_id_idx on public.email_events(user_id);
create index if not exists profiles_marketing_consent_idx on public.profiles(marketing_consent) where marketing_consent = true;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists supporter_access_touch_updated_at on public.supporter_access;
create trigger supporter_access_touch_updated_at
before update on public.supporter_access
for each row execute function public.touch_updated_at();

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, marketing_consent)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false)
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        marketing_consent = public.profiles.marketing_consent;

  insert into public.supporter_access (user_id, status, plan_name)
  values (new.id, 'free', 'free')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists create_profile_for_auth_user on auth.users;
create trigger create_profile_for_auth_user
after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

alter table public.profiles enable row level security;
alter table public.supporter_access enable row level security;
alter table public.email_events enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.supporter_access from anon, authenticated;
revoke all on public.email_events from anon, authenticated;

grant select on public.profiles to authenticated;
grant insert (id, email, display_name, marketing_consent) on public.profiles to authenticated;
grant update (display_name, marketing_consent) on public.profiles to authenticated;
grant select on public.supporter_access to authenticated;
grant select on public.email_events to authenticated;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles update own safe fields" on public.profiles;
create policy "profiles update own safe fields"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "supporter select own" on public.supporter_access;
create policy "supporter select own"
on public.supporter_access for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "email events select own" on public.email_events;
create policy "email events select own"
on public.email_events for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.prevent_unsafe_profile_update()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id then
    raise exception 'Profile id cannot be changed';
  end if;
  if new.email <> old.email then
    raise exception 'Profile email cannot be changed from the client';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_unsafe_profile_update on public.profiles;
create trigger prevent_unsafe_profile_update
before update on public.profiles
for each row execute function public.prevent_unsafe_profile_update();

create or replace function public.submit_supporter_request(
  p_payment_reference text,
  p_plan_name text default 'supporter unlock'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reference text := nullif(trim(p_payment_reference), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if v_reference is null or length(v_reference) < 4 or length(v_reference) > 160 then
    raise exception 'Payment reference must be 4 to 160 characters';
  end if;

  insert into public.supporter_access (
    user_id,
    status,
    plan_name,
    payment_provider,
    payment_reference
  )
  values (
    v_user_id,
    'pending',
    coalesce(nullif(trim(p_plan_name), ''), 'supporter unlock'),
    'paypal_manual',
    v_reference
  );
end;
$$;

grant execute on function public.submit_supporter_request(text, text) to authenticated;
