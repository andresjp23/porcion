-- HU-01 CA2: consent is stamped by the server and comes before any health data.

-- The acceptance time always comes from the server: it changes only when the
-- accepted policy version changes, and consent cannot be withdrawn by an
-- update (withdrawal is deleting the account, HU-16).
create function public.profiles_stamp_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.privacy_version is distinct from old.privacy_version then
    if new.privacy_version is null then
      raise exception 'Consent cannot be withdrawn by an update'
        using errcode = 'check_violation', hint = 'HU-16: delete the account instead';
    end if;
    new.privacy_accepted_at := now();
  else
    new.privacy_accepted_at := old.privacy_accepted_at;
  end if;
  return new;
end;
$$;

create trigger profiles_stamp_consent
  before update on public.profiles
  for each row execute function public.profiles_stamp_consent();

-- No health data before accepting the privacy policy.
alter table public.profiles add constraint profiles_health_data_needs_consent check (
  privacy_version is not null
  or (
    sex is null and birth_date is null and height_cm is null and activity is null
    and goal is null and kcal_target is null and protein_g is null and carbs_g is null
    and fat_g is null
  )
);
