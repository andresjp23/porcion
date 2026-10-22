begin;
select plan(21);

insert into auth.users (id, email) values
  ('66666666-6666-6666-6666-666666666666', 'author@example.com'),
  ('77777777-7777-7777-7777-777777777777', 'other@example.com');

-- Maintainer rows: one seed food and an old community food past its 24 h.
insert into public.foods (id, name, aliases, kcal_100, protein_100, carbs_100, fat_100, barcode, source, verified, created_by)
values
  ('a0000000-0000-0000-0000-000000000001', 'Palta Hass', '{aguacate}', 160, 2, 8.5, 14.7, null, 'seed', true, null),
  ('a0000000-0000-0000-0000-000000000002', 'Galletas', '{}', 480, 6, 70, 20, '7801234567894', 'user', false,
   '66666666-6666-6666-6666-666666666666');
update public.foods set created_at = now() - interval '25 hours'
  where id = 'a0000000-0000-0000-0000-000000000002';

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.foods'::regclass, 'public.food_portions'::regclass, 'public.favorites'::regclass)),
  'RLS is enabled on foods, food_portions and favorites'
);

select is(
  (select search_text from public.foods where id = 'a0000000-0000-0000-0000-000000000001'),
  'palta hass  aguacate',
  'search_text joins name, brand and aliases in lower case'
);

select is(
  public.food_search_text('Plátano', 'Ñuñoa', '{Maracuyá}'),
  'platano nunoa maracuya',
  'search_text has no accents'
);

select ok(
  public.is_valid_gtin('7801234567894') and public.is_valid_gtin('96385074')
    and not public.is_valid_gtin('7801234567890') and not public.is_valid_gtin('123456789012'),
  'barcodes must be canonical EAN-8 or EAN-13 with a valid check digit'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "66666666-6666-6666-6666-666666666666"}', true);

select is(
  (select count(*)::int from public.foods),
  2,
  'every signed-in user reads the shared base'
);

select lives_ok(
  $$insert into public.foods (id, name, kcal_100, protein_100, carbs_100, fat_100, source)
    values ('a0000000-0000-0000-0000-000000000003', 'Sopaipilla', 330, 5, 40, 16, 'user')$$,
  'a user adds a community food, authored by them by default'
);

select throws_ok(
  $$insert into public.foods (name, kcal_100, protein_100, carbs_100, fat_100, source)
    values ('Falso', 100, 1, 1, 1, 'seed')$$,
  '42501',
  null,
  'users cannot insert seed or Open Food Facts rows'
);

select throws_ok(
  $$insert into public.foods (name, kcal_100, protein_100, carbs_100, fat_100, source, verified)
    values ('Falso', 100, 1, 1, 1, 'user', true)$$,
  '42501',
  null,
  'users cannot mark their food as verified'
);

select throws_ok(
  $$insert into public.foods (name, kcal_100, protein_100, carbs_100, fat_100, source, created_by)
    values ('Falso', 100, 1, 1, 1, 'user', '77777777-7777-7777-7777-777777777777')$$,
  '42501',
  null,
  'users cannot author a food in someone else''s name'
);

select throws_ok(
  $$insert into public.foods (name, kcal_100, protein_100, carbs_100, fat_100, source)
    values ('Imposible', 950, 0, 0, 100, 'user')$$,
  '23514',
  null,
  'kcal per 100 g above 900 are rejected'
);

select throws_ok(
  $$insert into public.foods (name, kcal_100, protein_100, carbs_100, fat_100, source)
    values ('Imposible', 400, 50, 40, 20, 'user')$$,
  '23514',
  null,
  'macros adding up to more than 100 g per 100 g are rejected'
);

select throws_ok(
  $$insert into public.foods (name, kcal_100, protein_100, carbs_100, fat_100, source, barcode)
    values ('Copia', 480, 6, 70, 20, 'user', '7801234567894')$$,
  '23505',
  null,
  'a barcode belongs to one food only'
);

select lives_ok(
  $$insert into public.food_portions (food_id, name, grams, is_default)
    values ('a0000000-0000-0000-0000-000000000003', '1 unidad', 60, true)$$,
  'the author adds portions to a new food'
);

select throws_ok(
  $$insert into public.food_portions (food_id, name, grams, is_default)
    values ('a0000000-0000-0000-0000-000000000003', '2 unidades', 120, true)$$,
  '23505',
  null,
  'a food has at most one default portion'
);

select throws_ok(
  $$insert into public.food_portions (food_id, name, grams)
    values ('a0000000-0000-0000-0000-000000000002', '1 paquete', 140)$$,
  '42501',
  null,
  'after 24 h the author can no longer add portions (R-11)'
);

select throws_ok(
  $$delete from public.foods where id = 'a0000000-0000-0000-0000-000000000003'$$,
  '42501',
  null,
  'users cannot delete foods'
);

select lives_ok(
  $$insert into public.favorites (food_id) values ('a0000000-0000-0000-0000-000000000001')$$,
  'a user marks a favorite, owned by them by default'
);

-- The other user.
select set_config('request.jwt.claims', '{"sub": "77777777-7777-7777-7777-777777777777"}', true);

select throws_ok(
  $$insert into public.food_portions (food_id, name, grams)
    values ('a0000000-0000-0000-0000-000000000003', '1 bolsa', 300)$$,
  '42501',
  null,
  'only the author adds portions to a community food'
);

select is_empty(
  $$update public.food_portions set grams = 1 returning id$$,
  'only the author edits portions'
);

select is(
  (select count(*)::int from public.favorites),
  0,
  'a user does not see other users'' favorites'
);

select throws_ok(
  $$insert into public.favorites (user_id, food_id)
    values ('66666666-6666-6666-6666-666666666666', 'a0000000-0000-0000-0000-000000000003')$$,
  '42501',
  null,
  'a user cannot add favorites for someone else'
);

select * from finish();
rollback;
