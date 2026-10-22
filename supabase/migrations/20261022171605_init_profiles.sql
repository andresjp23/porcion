-- Enums for the whole MVP schema (docs/design.md §2) and the profiles table.

create type public.meal_type as enum ('breakfast', 'lunch', 'snack', 'dinner');
create type public.sex_for_calc as enum ('male', 'female');
create type public.activity_level as enum ('sedentary', 'light', 'moderate', 'high', 'very_high');
create type public.goal_type as enum ('lose', 'maintain', 'gain');
create type public.food_basis as enum ('g', 'ml');
create type public.food_source as enum ('seed', 'off', 'user');
create type public.report_status as enum ('open', 'resolved', 'dismissed');
create type public.list_status as enum ('active', 'archived');

-- profiles: 1:1 with auth.users, created by a trigger on signup.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  sex public.sex_for_calc,
  birth_date date,
  height_cm numeric(5, 1) check (height_cm between 100 and 250),
  activity public.activity_level,
  goal public.goal_type,
  kcal_target int check (kcal_target > 0),
  protein_g int check (protein_g >= 0),
  carbs_g int check (carbs_g >= 0),
  fat_g int check (fat_g >= 0),
  target_is_manual boolean not null default false,
  timezone text not null default 'America/Santiago',
  -- Null until the user accepts (Google sign-in accepts on /consent).
  privacy_version text,
  privacy_accepted_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint profiles_privacy_consistent check (
    (privacy_version is null) = (privacy_accepted_at is null)
  )
);

comment on column public.profiles.sex is 'Sex for the Mifflin-St Jeor calculation only (R-03).';
comment on column public.profiles.privacy_version is 'Accepted privacy policy version (HU-01 CA2).';

alter table public.profiles enable row level security;

-- Rows are created by the trigger and removed by the auth.users cascade.
revoke all on public.profiles from anon;
revoke insert, delete on public.profiles from authenticated;

create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- R-12: only adults. A check constraint cannot use current_date, so a trigger
-- validates the birth date whenever it is written.
create function public.profiles_validate_age()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_date is not null and new.birth_date > (current_date - interval '18 years') then
    raise exception 'User must be at least 18 years old'
      using errcode = 'check_violation', hint = 'R-12';
  end if;
  return new;
end;
$$;

create trigger profiles_validate_age
  before insert or update of birth_date on public.profiles
  for each row execute function public.profiles_validate_age();

-- Creates the profile on signup. Email signups send the accepted policy
-- version in the user metadata; OAuth signups cannot, so it stays null.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted_version text := nullif(new.raw_user_meta_data ->> 'privacy_version', '');
begin
  insert into public.profiles (id, privacy_version, privacy_accepted_at)
  values (
    new.id,
    accepted_version,
    case when accepted_version is not null then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
