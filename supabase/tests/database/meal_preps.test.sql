begin;
select plan(18);

-- A cook and another user who accepted the policy, and one who has not.
insert into auth.users (id, email, raw_user_meta_data) values
  ('abababab-abab-abab-abab-ababababab01', 'cook@example.com', '{"privacy_version": "2026-10"}'),
  ('abababab-abab-abab-abab-ababababab02', 'other@example.com', '{"privacy_version": "2026-10"}'),
  ('abababab-abab-abab-abab-ababababab03', 'pending@example.com', '{}');

insert into public.foods (id, name, kcal_100, protein_100, carbs_100, fat_100, source, verified, created_by)
values ('f0000000-0000-0000-0000-0000000000a1', 'Pechuga Prep', 110, 23, 0, 1.5, 'seed', true, null);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "abababab-abab-abab-abab-ababababab01"}', true);

select isnt(
  public.save_meal_prep(null, '  Pollo a la plancha ', '2026-10-26', 1275, null, $$[
    {"food_id": "f0000000-0000-0000-0000-0000000000a1", "food_name": "Pechuga Prep", "grams": 1700,
     "kcal_100": 110, "protein_100": 23, "carbs_100": 0, "fat_100": 1.5},
    {"food_name": "Aceite en spray", "grams": 3, "kcal_100": 884, "protein_100": 0, "carbs_100": 0, "fat_100": 100}
  ]$$),
  null,
  'a consented user saves a batch with its raw ingredients (HU-17)'
);

select results_eq(
  $$select name, cooked_grams, jsonb_array_length(ingredients), ingredients -> 0 ->> 'food_name', logged_grams
    from public.my_meal_preps()$$,
  $$values ('Pollo a la plancha'::text, 1275::numeric, 2, 'Pechuga Prep'::text, 0::numeric)$$,
  'my_meal_preps lists it trimmed, with its ingredients in order and nothing logged yet'
);

insert into public.food_logs (meal_prep_id, log_date, meal, quantity, grams, food_name, kcal, protein, carbs, fat)
select id, '2026-10-26', 'lunch', 150, 150, 'Pollo a la plancha', 223, 46, 0, 3.4 from public.meal_preps;
insert into public.food_logs (meal_prep_id, log_date, meal, quantity, grams, food_name, kcal, protein, carbs, fat)
select id, '2026-10-26', 'dinner', 180, 180, 'Pollo a la plancha', 268, 55.2, 0, 4 from public.meal_preps;

select is(
  (select logged_grams from public.my_meal_preps()),
  330::numeric,
  'logged_grams adds up the logs of the batch (HU-18 CA3)'
);

select is(
  public.save_meal_prep(
    (select id from public.meal_preps), 'Pollo a la plancha', '2026-10-26', 1260, 5,
    '[{"food_name": "Pechuga Prep", "grams": 1700, "kcal_100": 110, "protein_100": 23, "carbs_100": 0, "fat_100": 1.5}]'
  ),
  (select id from public.meal_preps),
  'saving with an id edits that batch (HU-17 CA6)'
);

select results_eq(
  $$select cooked_grams, servings, jsonb_array_length(ingredients), logged_grams from public.my_meal_preps()$$,
  $$values (1260::numeric, 5, 1, 330::numeric)$$,
  'its ingredients are replaced and its logs stay linked'
);

select throws_ok(
  $$select public.save_meal_prep(null, 'Vacío', '2026-10-26', null, null, '[]')$$,
  '23514',
  null,
  'a batch needs at least one ingredient'
);

select throws_ok(
  $$select public.save_meal_prep(null, 'Enorme', '2026-10-26', null, null,
    (select jsonb_agg(jsonb_build_object('food_name', 'Algo', 'grams', 10, 'kcal_100', 100,
      'protein_100', 1, 'carbs_100', 1, 'fat_100', 1)) from generate_series(1, 31)))$$,
  '23514',
  null,
  'and at most 30 (R-14)'
);

select throws_ok(
  $$insert into public.meal_prep_ingredients (meal_prep_id, food_name, grams, kcal_100, protein_100, carbs_100, fat_100, position)
    select (select id from public.meal_preps), 'Algo', 10, 100, 1, 1, 1, n from generate_series(1, 30) as n$$,
  '23514',
  null,
  'the 30-ingredient cap also holds for direct inserts'
);

select throws_ok(
  $$select public.save_meal_prep(null, 'Pesa rara', '2026-10-26', 25000, null,
    '[{"food_name": "Arroz", "grams": 200, "kcal_100": 360, "protein_100": 6.6, "carbs_100": 79, "fat_100": 0.6}]')$$,
  '23514',
  null,
  'the cooked weight stays within 1 and 20,000 g (R-14)'
);

select is(
  public.copy_meal('2026-10-26', '2026-10-27', 'lunch'),
  1,
  'repeating a meal copies the batch log'
);

select is(
  (select logged_grams from public.my_meal_preps()),
  480::numeric,
  'and the copy counts against the batch (HU-18 CA5)'
);

-- Someone else cannot see, edit or log against the batch. Its id is kept
-- first, since the other user's queries cannot see it.
select set_config('test.prep_id', (select id::text from public.meal_preps), true);
select set_config('request.jwt.claims', '{"sub": "abababab-abab-abab-abab-ababababab02"}', true);

select is(
  (select count(*)::int from public.my_meal_preps()) + (select count(*)::int from public.meal_prep_ingredients),
  0,
  'batches and their ingredients are private'
);

select throws_ok(
  $$insert into public.food_logs (meal_prep_id, log_date, meal, quantity, grams, food_name, kcal, protein, carbs, fat)
    values (current_setting('test.prep_id')::uuid, '2026-10-26', 'lunch', 100, 100, 'Robo', 1, 1, 1, 1)$$,
  '42501',
  null,
  'a log cannot point at someone else''s batch'
);

-- Under RLS the other user cannot see the batch, so it is reported as not found.
select throws_ok(
  $$select public.save_meal_prep(current_setting('test.prep_id')::uuid, 'Mío', '2026-10-26', null, null,
    '[{"food_name": "Algo", "grams": 10, "kcal_100": 1, "protein_100": 0, "carbs_100": 0, "fat_100": 0}]')$$,
  'P0002',
  null,
  'nor can they save over it'
);

select set_config('request.jwt.claims', '{"sub": "abababab-abab-abab-abab-ababababab03"}', true);
select throws_ok(
  $$select public.save_meal_prep(null, 'Sin consentimiento', '2026-10-26', null, null,
    '[{"food_name": "Algo", "grams": 10, "kcal_100": 1, "protein_100": 0, "carbs_100": 0, "fat_100": 0}]')$$,
  '42501',
  null,
  'without consent there is no batch to save (health data)'
);

select set_config('request.jwt.claims', '{"sub": "abababab-abab-abab-abab-ababababab01"}', true);
select is(
  (select jsonb_array_length(public.export_my_data() -> 'meal_preps' -> 0 -> 'ingredients')),
  1,
  'the export includes the batches with their ingredients (HU-16 CA1)'
);

delete from public.meal_preps;
select is(
  (select count(*)::int from public.food_logs where food_name = 'Pollo a la plancha' and meal_prep_id is null),
  3,
  'deleting a batch keeps its logs with their snapshot (HU-19 CA4)'
);

select public.save_meal_prep(null, 'Arroz', '2026-10-26', 600, 4,
  '[{"food_name": "Arroz", "grams": 200, "kcal_100": 360, "protein_100": 6.6, "carbs_100": 79, "fat_100": 0.6}]');
reset role;
delete from auth.users where id = 'abababab-abab-abab-abab-ababababab01';
select is(
  (select count(*)::int from public.meal_preps) + (select count(*)::int from public.meal_prep_ingredients),
  0,
  'deleting the account deletes the batches and their ingredients (HU-16 CA2)'
);

select * from finish();
rollback;
