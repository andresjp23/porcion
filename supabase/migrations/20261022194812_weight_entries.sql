-- O-0: one weight per user and day (HU-13). Moved ahead of G-1 because the
-- onboarding saves the starting weight here.

-- True when the current user has accepted the privacy policy. Health data
-- tables use it in their write policies (HU-01 CA2). Runs as the caller, so
-- the profiles RLS still applies.
create function public.has_consented()
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and privacy_version is not null
  );
$$;

create table public.weight_entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 1) not null check (weight_kg between 30 and 300),
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

comment on table public.weight_entries is 'Daily weight (HU-13). Upsert on (user_id, date).';

alter table public.weight_entries enable row level security;

revoke all on public.weight_entries from anon;

create policy "weight_entries: read own"
  on public.weight_entries for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "weight_entries: insert own after consent"
  on public.weight_entries for insert
  to authenticated
  with check (user_id = (select auth.uid()) and (select public.has_consented()));

create policy "weight_entries: update own after consent"
  on public.weight_entries for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.has_consented()));

create policy "weight_entries: delete own"
  on public.weight_entries for delete
  to authenticated
  using (user_id = (select auth.uid()));
