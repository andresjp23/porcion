begin;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('ffffffff-ffff-ffff-ffff-fffffffffff1', 'repeat@example.com', '{"privacy_version": "2026-10"}'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff2', 'other@example.com', '{"privacy_version": "2026-10"}');

insert into public.food_logs (user_id, log_date, meal, portion_id, quantity, grams, food_name, kcal, protein, carbs, fat, created_at)
values
  ('ffffffff-ffff-ffff-ffff-fffffffffff1', '2026-10-21', 'breakfast', null, 100, 100, 'Marraqueta', 272, 10.8, 49.7, 2.4, '2026-10-21 08:00'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff1', '2026-10-21', 'breakfast', null, 30, 30, 'Palta Hass', 67, 0.5, 2.5, 6.1, '2026-10-21 08:01'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff1', '2026-10-21', 'lunch', null, 158, 158, 'Arroz', 205, 4.3, 44, 0.4, '2026-10-21 13:00'),
  ('ffffffff-ffff-ffff-ffff-fffffffffff2', '2026-10-21', 'breakfast', null, 100, 100, 'Ajeno', 500, 1, 1, 1, '2026-10-21 08:00');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "ffffffff-ffff-ffff-ffff-fffffffffff1"}', true);

select is(
  public.copy_meal('2026-10-21', '2026-10-22', 'breakfast'),
  2,
  'copies the user''s logs of that meal (HU-07)'
);

select results_eq(
  $$select food_name, quantity, grams, kcal from public.food_logs
    where log_date = '2026-10-22' order by created_at$$,
  $$values ('Marraqueta'::text, 100::numeric, 100::numeric, 272::numeric),
           ('Palta Hass'::text, 30::numeric, 30::numeric, 67::numeric)$$,
  'with the same quantity and snapshot, in the same order (HU-07 CA2)'
);

select is(
  (select count(*)::int from public.food_logs where log_date = '2026-10-22' and meal <> 'breakfast'),
  0,
  'other meals are left alone'
);

select is(
  public.copy_meal('2026-10-20', '2026-10-22', 'dinner'),
  0,
  'a meal with nothing to copy copies nothing'
);

select is(
  (select count(*)::int from public.food_logs where food_name = 'Ajeno'),
  0,
  'someone else''s logs are never copied (nor visible)'
);

reset role;
set local role anon;
select throws_ok(
  $$select public.copy_meal('2026-10-21', '2026-10-22', 'breakfast')$$,
  '42501',
  null,
  'anonymous visitors cannot copy meals'
);

select * from finish();
rollback;
