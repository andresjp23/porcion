begin;
select plan(12);

insert into auth.users (id, email) values
  ('88888888-8888-8888-8888-888888888888', 'searcher@example.com');

-- Own rows with fixed ids: assertions only look at these, so the seed does not
-- change the results.
insert into public.foods (id, name, brand, aliases, kcal_100, protein_100, carbs_100, fat_100, source, verified)
values
  ('b0000000-0000-0000-0000-000000000001', 'Palta Test', null, '{aguacate}', 160, 2, 8.5, 14.7, 'seed', true),
  ('b0000000-0000-0000-0000-000000000002', 'Plátano Test', null, '{banana}', 89, 1.1, 20.2, 0.3, 'seed', true),
  ('b0000000-0000-0000-0000-000000000003', 'Panqueque Test', null, '{}', 227, 6.4, 28.3, 9.7, 'seed', true),
  ('b0000000-0000-0000-0000-000000000004', 'Hallulla Test', null, '{panqueque}', 318, 7.7, 53.7, 8, 'seed', true),
  ('b0000000-0000-0000-0000-000000000005', 'Empanqueque Test', null, '{}', 250, 8, 30, 10, 'seed', true),
  ('b0000000-0000-0000-0000-000000000006', 'Galletas Test', 'Marca 100%', '{}', 480, 6, 70, 20, 'user', false),
  ('b0000000-0000-0000-0000-000000000007', 'Galletas Test', 'Otra marca', '{}', 470, 6, 69, 19, 'seed', true);

insert into public.food_portions (food_id, name, grams, is_default) values
  ('b0000000-0000-0000-0000-000000000001', '1 palta', 136, false),
  ('b0000000-0000-0000-0000-000000000001', '1 cucharada', 15, true);

create temporary view test_ids as
  select id from public.foods where id::text like 'b0000000-%';
grant select on test_ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "88888888-8888-8888-8888-888888888888"}', true);

select results_eq(
  $$select name from public.search_foods('PLATANO') with ordinality as s
    where id in (select id from test_ids) order by ordinality$$,
  array['Plátano Test'],
  'ignores accents and case (HU-04 CA3)'
);

select results_eq(
  $$select name from public.search_foods('aguacate') with ordinality as s
    where id in (select id from test_ids) order by ordinality$$,
  array['Palta Test'],
  'matches aliases: "aguacate" finds palta (HU-04 CA3)'
);

select results_eq(
  $$select name from public.search_foods('platno') with ordinality as s
    where id in (select id from test_ids) order by ordinality$$,
  array['Plátano Test'],
  'tolerates a missing letter'
);

select is_empty(
  $$select 1 from public.search_foods('palta') where id = 'b0000000-0000-0000-0000-000000000002'$$,
  'does not return unrelated foods'
);

select results_eq(
  $$select name from public.search_foods('panqueque') with ordinality as s
    where id in (select id from test_ids) order by ordinality$$,
  array['Panqueque Test', 'Hallulla Test', 'Empanqueque Test'],
  'ranks a name prefix, then a word or alias prefix, then any other match'
);

select results_eq(
  $$select brand from public.search_foods('galletas test') with ordinality as s
    where id in (select id from test_ids) order by ordinality$$,
  array['Otra marca', 'Marca 100%'],
  'between equal matches, verified foods come first'
);

select results_eq(
  $$select brand from public.search_foods('100%') with ordinality as s
    where id in (select id from test_ids) order by ordinality$$,
  array['Marca 100%'],
  'matches the brand, with % taken literally'
);

select results_eq(
  $$select brand from public.search_foods('%') with ordinality as s
    where id in (select id from test_ids) order by ordinality$$,
  array['Marca 100%'],
  'a lone % is not a wildcard: it only finds a literal %'
);

select is_empty(
  $$select 1 from public.search_foods('   ')$$,
  'a blank query returns nothing'
);

select results_eq(
  $$select default_portion_name, default_portion_grams from public.search_foods('palta test')
    where id = 'b0000000-0000-0000-0000-000000000001'$$,
  $$values ('1 cucharada'::text, 15::numeric)$$,
  'returns the default portion for the 2-tap add (HU-04 CA4)'
);

select is(
  (select count(*)::int from public.search_foods('test', 2)),
  2,
  'respects the limit'
);

reset role;
set local role anon;
select throws_ok(
  $$select * from public.search_foods('palta')$$,
  '42501',
  null,
  'anonymous visitors cannot search'
);

select * from finish();
rollback;
