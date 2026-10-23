begin;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 'editor@example.com', '{"privacy_version": "2026-10"}'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', 'stranger@example.com', '{"privacy_version": "2026-10"}');

insert into public.foods (id, name, kcal_100, protein_100, carbs_100, fat_100, source, created_by)
values ('a1000000-0000-0000-0000-000000000001', 'Kuchen', 300, 5, 45, 11, 'user',
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1');
insert into public.food_portions (id, food_id, name, grams, is_default) values
  ('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '1 trozo', 80, true),
  ('a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', '1 kuchen', 800, false);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1"}', true);

-- The author logged two slices with the portion that is about to go.
insert into public.food_logs (food_id, log_date, meal, portion_id, quantity, grams, food_name, kcal, protein, carbs, fat)
values ('a1000000-0000-0000-0000-000000000001', '2026-10-22', 'snack',
        'a2000000-0000-0000-0000-000000000001', 2, 160, 'Kuchen', 480, 8, 72, 17.6);

select lives_ok(
  $$select public.update_food(
    food_id => 'a1000000-0000-0000-0000-000000000001',
    name => ' Kuchen de manzana ',
    brand => 'Casero',
    basis => 'g',
    kcal_100 => 280, protein_100 => 4, carbs_100 => 44, fat_100 => 10,
    portions => '[{"id": "a2000000-0000-0000-0000-000000000002", "name": "1 kuchen entero", "grams": 750},
                  {"name": "1 trozo chico", "grams": 60}]'
  )$$,
  'the author edits the food and its portions in one call (R-11)'
);

select results_eq(
  $$select name, brand, kcal_100 from public.foods where id = 'a1000000-0000-0000-0000-000000000001'$$,
  $$values ('Kuchen de manzana'::text, 'Casero'::text, 280::numeric)$$,
  'the food has the new values'
);

select results_eq(
  $$select name, grams, is_default from public.food_portions
    where food_id = 'a1000000-0000-0000-0000-000000000001' order by grams desc$$,
  $$values ('1 kuchen entero'::text, 750::numeric, true), ('1 trozo chico'::text, 60::numeric, false)$$,
  'kept portions are updated, new ones added, missing ones removed, and the first is the default'
);

select ok(
  exists (select 1 from public.food_portions where id = 'a2000000-0000-0000-0000-000000000002'),
  'a kept portion keeps its id'
);

select results_eq(
  $$select portion_id, quantity, grams, kcal from public.food_logs
    where food_id = 'a1000000-0000-0000-0000-000000000001'$$,
  $$values (null::uuid, 160::numeric, 160::numeric, 480::numeric)$$,
  'a log of a deleted portion switches to plain grams and keeps its snapshot'
);

select throws_ok(
  $$select public.update_food(food_id => 'a1000000-0000-0000-0000-000000000001', name => 'X',
    basis => 'g', kcal_100 => 950, protein_100 => 0, carbs_100 => 0, fat_100 => 100)$$,
  '23514',
  null,
  'the per-100 g limits still apply'
);

-- Someone else.
select set_config('request.jwt.claims', '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2"}', true);

select throws_ok(
  $$select public.update_food(food_id => 'a1000000-0000-0000-0000-000000000001', name => 'Robado',
    basis => 'g', kcal_100 => 1, protein_100 => 0, carbs_100 => 0, fat_100 => 0)$$,
  '42501',
  null,
  'only the author edits it'
);

-- Once someone else logs it, the window closes for the author too.
insert into public.food_logs (food_id, log_date, meal, quantity, grams, food_name, kcal, protein, carbs, fat)
values ('a1000000-0000-0000-0000-000000000001', '2026-10-22', 'snack', 100, 100, 'Kuchen', 280, 4, 44, 10);

select set_config('request.jwt.claims', '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1"}', true);

select throws_ok(
  $$select public.update_food(food_id => 'a1000000-0000-0000-0000-000000000001', name => 'Tarde',
    basis => 'g', kcal_100 => 1, protein_100 => 0, carbs_100 => 0, fat_100 => 0)$$,
  '42501',
  null,
  'the author cannot edit it after someone else logged it (R-11)'
);

select is(
  (select name from public.foods where id = 'a1000000-0000-0000-0000-000000000001'),
  'Kuchen de manzana',
  'nothing changed'
);

reset role;
set local role anon;
select throws_ok(
  $$select public.update_food(food_id => 'a1000000-0000-0000-0000-000000000001', name => 'Anon',
    basis => 'g', kcal_100 => 1, protein_100 => 0, carbs_100 => 0, fat_100 => 0)$$,
  '42501',
  null,
  'anonymous visitors cannot edit foods'
);

select * from finish();
rollback;
