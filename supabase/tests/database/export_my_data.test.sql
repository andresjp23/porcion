begin;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('abababab-abab-abab-abab-ababababab01', 'me@example.com', '{"privacy_version": "2026-10"}'),
  ('abababab-abab-abab-abab-ababababab02', 'other@example.com', '{"privacy_version": "2026-10"}');

insert into public.foods (id, name, kcal_100, protein_100, carbs_100, fat_100, source, verified, created_by)
values
  ('a1000000-0000-0000-0000-000000000001', 'Kuchen de la abuela', 300, 5, 45, 11, 'user', false, 'abababab-abab-abab-abab-ababababab01'),
  ('a1000000-0000-0000-0000-000000000002', 'Pan ajeno', 270, 9, 47, 3.6, 'user', false, 'abababab-abab-abab-abab-ababababab02');
insert into public.food_portions (food_id, name, grams, is_default) values
  ('a1000000-0000-0000-0000-000000000001', '1 trozo', 90, true);

insert into public.weight_entries (user_id, date, weight_kg) values
  ('abababab-abab-abab-abab-ababababab01', '2026-10-20', 80),
  ('abababab-abab-abab-abab-ababababab01', '2026-10-21', 79.5),
  ('abababab-abab-abab-abab-ababababab02', '2026-10-21', 60);
insert into public.food_logs (user_id, log_date, meal, quantity, grams, food_name, kcal, protein, carbs, fat) values
  ('abababab-abab-abab-abab-ababababab01', '2026-10-21', 'lunch', 90, 90, 'Kuchen de la abuela', 270, 4.5, 40.5, 9.9),
  ('abababab-abab-abab-abab-ababababab02', '2026-10-21', 'lunch', 100, 100, 'Ajeno', 500, 1, 1, 1);
insert into public.favorites (user_id, food_id) values
  ('abababab-abab-abab-abab-ababababab01', 'a1000000-0000-0000-0000-000000000002');
insert into public.shopping_lists (id, user_id) values
  ('a2000000-0000-0000-0000-000000000001', 'abababab-abab-abab-abab-ababababab01'),
  ('a2000000-0000-0000-0000-000000000002', 'abababab-abab-abab-abab-ababababab02');
insert into public.shopping_list_items (list_id, label) values
  ('a2000000-0000-0000-0000-000000000001', 'Leche'),
  ('a2000000-0000-0000-0000-000000000002', 'Ajeno');
insert into public.food_reports (food_id, reporter_id, reason) values
  ('a1000000-0000-0000-0000-000000000002', 'abababab-abab-abab-abab-ababababab01', 'Faltan las grasas');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "abababab-abab-abab-abab-ababababab01"}', true);

create temp table export as select public.export_my_data() as data;

select is((select data #>> '{account,email}' from export), 'me@example.com', 'includes the account email');
select is((select data #>> '{profile,privacy_version}' from export), '2026-10', 'includes the profile');
select is(
  (select jsonb_path_query_array(data, '$.weight_entries[*].weight_kg') from export),
  '[80.0, 79.5]'::jsonb,
  'includes only the own weights, oldest first'
);
select is(
  (select jsonb_path_query_array(data, '$.food_logs[*].food_name') from export),
  '["Kuchen de la abuela"]'::jsonb,
  'includes only the own logs'
);
select is(
  (select data #>> '{favorites,0,food_name}' from export),
  'Pan ajeno',
  'favorites carry the food name'
);
select is(
  (select jsonb_path_query_array(data, '$.shopping_lists[*].items[*].label') from export),
  '["Leche"]'::jsonb,
  'includes only the own lists, with their items'
);
select is(
  (select jsonb_path_query_array(data, '$.contributed_foods[*].name') from export),
  '["Kuchen de la abuela"]'::jsonb,
  'includes only the foods the user contributed (HU-16 CA1)'
);
select is(
  (select data #>> '{contributed_foods,0,portions,0,name}' from export),
  '1 trozo',
  'contributed foods carry their portions'
);
select ok(
  (select not (data -> 'contributed_foods' -> 0 ? 'created_by') from export),
  'does not repeat the author column'
);
select is(
  (select data #>> '{food_reports,0,reason}' from export),
  'Faltan las grasas',
  'includes the own reports'
);
select ok(
  (select data::text not like '%other@example.com%' and data::text not like '%Ajeno%' from export),
  'nothing from another user leaks'
);

set local role anon;
select throws_ok(
  'select public.export_my_data()',
  '42501',
  null,
  'anonymous callers cannot export'
);

select * from finish();
rollback;
