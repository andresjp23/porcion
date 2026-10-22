begin;
select plan(9);

-- One user who accepted the policy (email signup) and one who has not (Google).
insert into auth.users (id, email, raw_user_meta_data) values
  ('44444444-4444-4444-4444-444444444444', 'consented@example.com', '{"privacy_version": "2026-10"}'),
  ('55555555-5555-5555-5555-555555555555', 'pending@example.com', '{}');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.weight_entries'::regclass),
  'RLS is enabled on weight_entries'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "44444444-4444-4444-4444-444444444444"}', true);

select lives_ok(
  $$insert into public.weight_entries (date, weight_kg) values ('2026-10-22', 80.4)$$,
  'a consented user saves the weight of the day, owned by them by default'
);

select lives_ok(
  $$insert into public.weight_entries (date, weight_kg) values ('2026-10-22', 80.1)
    on conflict (user_id, date) do update set weight_kg = excluded.weight_kg$$,
  'saving again the same day upserts (HU-13 CA1)'
);

select is(
  (select weight_kg from public.weight_entries where date = '2026-10-22'),
  80.1,
  'the day keeps the last weight'
);

select throws_ok(
  $$insert into public.weight_entries (date, weight_kg) values ('2026-10-23', 29.9)$$,
  '23514',
  null,
  'weights outside 30–300 kg are rejected (HU-13 CA2)'
);

select throws_ok(
  $$insert into public.weight_entries (user_id, date, weight_kg)
    values ('55555555-5555-5555-5555-555555555555', '2026-10-22', 70)$$,
  '42501',
  null,
  'a user cannot save weights for someone else'
);

-- The user without consent.
select set_config('request.jwt.claims', '{"sub": "55555555-5555-5555-5555-555555555555"}', true);

select throws_ok(
  $$insert into public.weight_entries (date, weight_kg) values ('2026-10-22', 70)$$,
  '42501',
  null,
  'no weights before accepting the privacy policy'
);

select is(
  (select count(*)::int from public.weight_entries),
  0,
  'a user does not see other users'' weights'
);

reset role;
select is(
  (select count(*)::int from public.weight_entries
   where user_id in ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555')),
  1,
  'only the consented user''s entry exists'
);

select * from finish();
rollback;
