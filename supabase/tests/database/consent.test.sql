begin;
select plan(6);

-- A Google user signs up without consent.
insert into auth.users (id, email, raw_user_meta_data) values
  ('33333333-3333-3333-3333-333333333333', 'google@example.com', '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333"}', true);

select throws_ok(
  $$update public.profiles set height_cm = 170$$,
  '23514',
  null,
  'health data cannot be saved before consent'
);

update public.profiles
  set privacy_version = '2026-10', privacy_accepted_at = '2000-01-01';

select is(
  (select privacy_version from public.profiles),
  '2026-10',
  'the user can accept the policy on /consent'
);

select ok(
  (select privacy_accepted_at > '2000-01-01' from public.profiles),
  'the acceptance time comes from the server, not the client'
);

select lives_ok(
  $$update public.profiles set height_cm = 170$$,
  'health data can be saved after consent'
);

update public.profiles set privacy_accepted_at = '2000-01-01';
select ok(
  (select privacy_accepted_at > '2000-01-01' from public.profiles),
  'the acceptance time cannot be edited on its own'
);

select throws_ok(
  $$update public.profiles set privacy_version = null$$,
  '23514',
  'Consent cannot be withdrawn by an update',
  'consent cannot be withdrawn by an update'
);

select * from finish();
rollback;
