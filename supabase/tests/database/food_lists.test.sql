begin;
select plan(7);

insert into auth.users (id, email) values
  ('99999999-9999-9999-9999-999999999991', 'cook@example.com'),
  ('99999999-9999-9999-9999-999999999992', 'neighbor@example.com');

insert into public.foods (id, name, kcal_100, protein_100, carbs_100, fat_100, source, verified, created_by, created_at)
values
  ('c0000000-0000-0000-0000-000000000001', 'Pan Lista', 270, 9, 47, 3.6, 'seed', true, null, now() - interval '3 days'),
  ('c0000000-0000-0000-0000-000000000002', 'Queque Mío', 380, 6, 50, 17, 'user', false,
   '99999999-9999-9999-9999-999999999991', now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000003', 'Kuchen Mío', 300, 5, 45, 11, 'user', false,
   '99999999-9999-9999-9999-999999999991', now() - interval '1 day'),
  ('c0000000-0000-0000-0000-000000000004', 'Sopaipilla Ajena', 330, 5, 40, 16, 'user', false,
   '99999999-9999-9999-9999-999999999992', now());

insert into public.food_portions (food_id, name, grams, is_default) values
  ('c0000000-0000-0000-0000-000000000001', '1 rebanada', 27, true);

insert into public.favorites (user_id, food_id, created_at) values
  ('99999999-9999-9999-9999-999999999991', 'c0000000-0000-0000-0000-000000000001', now() - interval '1 hour'),
  ('99999999-9999-9999-9999-999999999991', 'c0000000-0000-0000-0000-000000000004', now()),
  ('99999999-9999-9999-9999-999999999992', 'c0000000-0000-0000-0000-000000000003', now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "99999999-9999-9999-9999-999999999991"}', true);

select results_eq(
  $$select name from public.favorite_foods()$$,
  array['Sopaipilla Ajena', 'Pan Lista'],
  'favorites: only the user''s own, most recently marked first'
);

select results_eq(
  $$select default_portion_name, default_portion_grams from public.favorite_foods()
    where id = 'c0000000-0000-0000-0000-000000000001'$$,
  $$values ('1 rebanada'::text, 27::numeric)$$,
  'favorites come with their default portion'
);

select results_eq(
  $$select name from public.my_foods()$$,
  array['Kuchen Mío', 'Queque Mío'],
  'my foods: only the ones the user created, newest first'
);

select set_config('request.jwt.claims', '{"sub": "99999999-9999-9999-9999-999999999992"}', true);

select results_eq(
  $$select name from public.my_foods()$$,
  array['Sopaipilla Ajena'],
  'another user sees only their own foods'
);

select results_eq(
  $$select name from public.favorite_foods()$$,
  array['Kuchen Mío'],
  'another user sees only their own favorites'
);

reset role;
set local role anon;

select throws_ok(
  $$select * from public.my_foods()$$,
  '42501',
  null,
  'anonymous visitors cannot list foods'
);

select throws_ok(
  $$select * from public.food_list_items$$,
  '42501',
  null,
  'anonymous visitors cannot read the list view'
);

select * from finish();
rollback;
