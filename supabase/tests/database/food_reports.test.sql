begin;
select plan(11);

insert into auth.users (id, email) values
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'r1@example.com'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'r2@example.com'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'r3@example.com');

insert into public.foods (id, name, kcal_100, protein_100, carbs_100, fat_100, source, verified)
values
  ('e0000000-0000-0000-0000-000000000001', 'Kuchen comunidad', 300, 5, 45, 11, 'user', false),
  ('e0000000-0000-0000-0000-000000000002', 'Pan del seed', 270, 9, 47, 3.6, 'seed', true);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "cccccccc-cccc-cccc-cccc-ccccccccccc1"}', true);

select lives_ok(
  $$insert into public.food_reports (food_id, reason)
    values ('e0000000-0000-0000-0000-000000000001', 'Las calorías son de 100 ml, no de 100 g')$$,
  'a user reports a community food (HU-10 CA1)'
);

select is(
  (select open_reports from public.foods where id = 'e0000000-0000-0000-0000-000000000001'),
  1,
  'the report counts as open on the food'
);

select throws_ok(
  $$insert into public.food_reports (food_id, reason)
    values ('e0000000-0000-0000-0000-000000000001', 'Otra vez')$$,
  '23505',
  null,
  'one open report per user and food'
);

select throws_ok(
  $$insert into public.food_reports (food_id, reason)
    values ('e0000000-0000-0000-0000-000000000002', 'No me cuadra')$$,
  '42501',
  null,
  'seed foods are not reported from the app'
);

select throws_ok(
  $$insert into public.food_reports (food_id, reason) values ('e0000000-0000-0000-0000-000000000001', '  ')$$,
  '23514',
  null,
  'a reason is required'
);

select throws_ok(
  $$insert into public.food_reports (food_id, reason, status)
    values ('e0000000-0000-0000-0000-000000000001', 'Ya resuelto', 'resolved')$$,
  '42501',
  null,
  'users cannot file a report as already resolved'
);

select throws_ok(
  $$update public.food_reports set status = 'dismissed'$$,
  '42501',
  null,
  'users cannot resolve reports'
);

select set_config('request.jwt.claims', '{"sub": "cccccccc-cccc-cccc-cccc-ccccccccccc2"}', true);
insert into public.food_reports (food_id, reason)
  values ('e0000000-0000-0000-0000-000000000001', 'La porción pesa menos');

select is(
  (select count(*)::int from public.food_reports),
  1,
  'a user sees only their own reports'
);

select set_config('request.jwt.claims', '{"sub": "cccccccc-cccc-cccc-cccc-ccccccccccc3"}', true);
insert into public.food_reports (food_id, reason)
  values ('e0000000-0000-0000-0000-000000000001', 'Grasas muy altas');

select is(
  (select open_reports from public.foods where id = 'e0000000-0000-0000-0000-000000000001'),
  3,
  'three open reports put the food under review (HU-10 CA2)'
);

-- The maintainer, from the dashboard.
reset role;
update public.food_reports set status = 'resolved'
  where reporter_id = 'cccccccc-cccc-cccc-cccc-ccccccccccc1';

select is(
  (select open_reports from public.foods where id = 'e0000000-0000-0000-0000-000000000001'),
  2,
  'resolving a report lowers the count'
);

delete from public.food_reports where reporter_id = 'cccccccc-cccc-cccc-cccc-ccccccccccc2';

select is(
  (select open_reports from public.foods where id = 'e0000000-0000-0000-0000-000000000001'),
  1,
  'deleting a report lowers the count too'
);

select * from finish();
rollback;
