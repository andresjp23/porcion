begin;
select plan(9);

-- Two users: one signs up with email (sends consent), one with Google (does not).
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'email@example.com', '{"privacy_version": "2026-10"}'),
  ('22222222-2222-2222-2222-222222222222', 'google@example.com', '{}');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);

select is(
  (select privacy_version from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  '2026-10',
  'email signup stores the accepted policy version'
);

select ok(
  (select privacy_accepted_at is not null from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'email signup stores the acceptance time'
);

select ok(
  (select privacy_version is null and privacy_accepted_at is null
   from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'OAuth signup creates a profile without consent'
);

-- Act as the email user.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111"}', true);

select is(
  (select count(*)::int from public.profiles),
  1,
  'a user only sees their own profile'
);

update public.profiles set display_name = 'Hacked' where id = '22222222-2222-2222-2222-222222222222';
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222"}', true);
select is(
  (select display_name from public.profiles),
  null,
  'a user cannot update another profile'
);

select throws_ok(
  $$insert into public.profiles (id) values ('22222222-2222-2222-2222-222222222222')$$,
  '42501',
  null,
  'users cannot insert profiles directly'
);

-- Birth dates are health data, so test them as the user who accepted the policy.
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111"}', true);

select throws_ok(
  $$update public.profiles set birth_date = current_date - interval '17 years'$$,
  '23514',
  'User must be at least 18 years old',
  'birth dates under 18 are rejected (R-12)'
);

select lives_ok(
  $$update public.profiles set birth_date = current_date - interval '18 years'$$,
  'a user who turns 18 today is accepted'
);

select * from finish();
rollback;
