begin;
select plan(14);

-- Two users who accepted the policy and one who has not.
insert into auth.users (id, email, raw_user_meta_data) values
  ('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'eater@example.com', '{"privacy_version": "2026-10"}'),
  ('dddddddd-dddd-dddd-dddd-ddddddddddd2', 'other@example.com', '{"privacy_version": "2026-10"}'),
  ('dddddddd-dddd-dddd-dddd-ddddddddddd3', 'pending@example.com', '{}');

insert into public.foods (id, name, kcal_100, protein_100, carbs_100, fat_100, source, verified, created_by)
values
  ('f0000000-0000-0000-0000-000000000001', 'Huevo Log', 148, 12.4, 1, 10, 'seed', true, null),
  ('f0000000-0000-0000-0000-000000000002', 'Pan Log', 272, 10.8, 49.7, 2.4, 'seed', true, null),
  ('f0000000-0000-0000-0000-000000000003', 'Queque Log', 380, 6, 50, 17, 'user', false,
   'dddddddd-dddd-dddd-dddd-ddddddddddd1');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "dddddddd-dddd-dddd-dddd-ddddddddddd1"}', true);

select lives_ok(
  $$insert into public.food_logs (food_id, log_date, meal, quantity, grams, food_name, kcal, protein, carbs, fat, created_at)
    values
      ('f0000000-0000-0000-0000-000000000001', '2026-10-22', 'breakfast', 2, 100, 'Huevo Log', 148, 12.4, 1, 10, now() - interval '3 hours'),
      ('f0000000-0000-0000-0000-000000000002', '2026-10-22', 'breakfast', 1, 100, 'Pan Log', 272, 10.8, 49.7, 2.4, now() - interval '2 hours'),
      ('f0000000-0000-0000-0000-000000000001', '2026-10-22', 'lunch', 1, 50, 'Huevo Log', 74, 6.2, 0.5, 5, now() - interval '1 hour'),
      ('f0000000-0000-0000-0000-000000000003', '2026-10-21', 'dinner', 1, 100, 'Queque Log', 380, 6, 50, 17, now() - interval '1 day')$$,
  'a consented user logs what they ate, owned by them by default'
);

select results_eq(
  $$select meal::text, entries, kcal, protein from public.day_summary('2026-10-22')$$,
  $$values ('breakfast'::text, 2, 420::numeric, 23.2::numeric), ('lunch'::text, 1, 74::numeric, 6.2::numeric)$$,
  'day_summary adds up each meal of the day (HU-03)'
);

select results_eq(
  $$select name from public.recent_foods() with ordinality as r
    where id::text like 'f0000000-%' order by ordinality$$,
  array['Huevo Log', 'Pan Log', 'Queque Log'],
  'recent_foods lists each food once, most recently logged first (HU-04 CA2)'
);

select results_eq(
  $$select name from public.search_foods('log') with ordinality as s
    where id in ('f0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002')
    order by ordinality$$,
  array['Huevo Log', 'Pan Log'],
  'between equal matches, the foods the user logs most come first'
);

select throws_ok(
  $$insert into public.food_logs (log_date, meal, quantity, grams, food_name, kcal, protein, carbs, fat)
    values ('2026-10-22', 'snack', 0, 100, 'Nada', 0, 0, 0, 0)$$,
  '23514',
  null,
  'quantity must be positive'
);

select throws_ok(
  $$insert into public.food_logs (user_id, log_date, meal, quantity, grams, food_name, kcal, protein, carbs, fat)
    values ('dddddddd-dddd-dddd-dddd-ddddddddddd2', '2026-10-22', 'snack', 1, 100, 'Ajeno', 1, 0, 0, 0)$$,
  '42501',
  null,
  'a user cannot log food for someone else'
);

select ok(
  public.can_edit_food('f0000000-0000-0000-0000-000000000003'),
  'the author can still edit a food only they have logged'
);

-- The other user.
select set_config('request.jwt.claims', '{"sub": "dddddddd-dddd-dddd-dddd-ddddddddddd2"}', true);

select is(
  (select count(*)::int from public.food_logs),
  0,
  'a user does not see other users'' logs'
);

select is_empty(
  $$select * from public.day_summary('2026-10-22')$$,
  'nor their day summary'
);

select is_empty(
  $$update public.food_logs set kcal = 0 returning id$$,
  'nor can they change them'
);

insert into public.food_logs (food_id, log_date, meal, quantity, grams, food_name, kcal, protein, carbs, fat)
values ('f0000000-0000-0000-0000-000000000003', '2026-10-22', 'snack', 1, 100, 'Queque Log', 380, 6, 50, 17);

select set_config('request.jwt.claims', '{"sub": "dddddddd-dddd-dddd-dddd-ddddddddddd1"}', true);

select ok(
  not public.can_edit_food('f0000000-0000-0000-0000-000000000003'),
  'once someone else logs it, the author can no longer edit it (R-11)'
);

-- The user without consent.
select set_config('request.jwt.claims', '{"sub": "dddddddd-dddd-dddd-dddd-ddddddddddd3"}', true);

select throws_ok(
  $$insert into public.food_logs (log_date, meal, quantity, grams, food_name, kcal, protein, carbs, fat)
    values ('2026-10-22', 'lunch', 1, 100, 'Antes de aceptar', 100, 1, 1, 1)$$,
  '42501',
  null,
  'no logs before accepting the privacy policy'
);

-- The maintainer deletes a food: the history keeps its snapshot.
reset role;
delete from public.foods where id = 'f0000000-0000-0000-0000-000000000002';

select results_eq(
  $$select food_id, food_name, kcal from public.food_logs
    where user_id = 'dddddddd-dddd-dddd-dddd-ddddddddddd1' and food_name = 'Pan Log'$$,
  $$values (null::uuid, 'Pan Log'::text, 272::numeric)$$,
  'deleting a food keeps the logs that used it (R-02)'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.food_logs'::regclass),
  'RLS is enabled on food_logs'
);

select * from finish();
rollback;
