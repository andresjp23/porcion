begin;
select plan(9);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'creator@example.com');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"}', true);

create temporary table created (id uuid) on commit drop;
grant all on created to authenticated;

insert into created
select public.create_food(
  name => '  Atún en agua ',
  brand => '',
  basis => 'g',
  kcal_100 => 116,
  protein_100 => 26,
  carbs_100 => 0,
  fat_100 => 1.2,
  barcode => '7801234567894',
  portions => '[{"name": "1 lata", "grams": 120}, {"name": "1/2 lata", "grams": 60}]'
);

select results_eq(
  $$select name, brand, source::text, verified, barcode from public.foods where id = (select id from created)$$,
  $$values ('Atún en agua'::text, null::text, 'user'::text, false, '7801234567894'::text)$$,
  'creates a trimmed, unverified community food (HU-09 CA4)'
);

select results_eq(
  $$select name, grams, is_default from public.food_portions
    where food_id = (select id from created) order by grams desc$$,
  $$values ('1 lata'::text, 120::numeric, true), ('1/2 lata'::text, 60::numeric, false)$$,
  'saves the portions, the first one as the default (HU-09 CA2)'
);

select ok(
  (select public.can_edit_food(id) from created),
  'the author can edit the new food'
);

select lives_ok(
  $$select public.create_food(name => 'Agua', basis => 'ml', kcal_100 => 0, protein_100 => 0,
    carbs_100 => 0, fat_100 => 0)$$,
  'portions and barcode are optional'
);

select throws_ok(
  $$select public.create_food(name => 'Copia', basis => 'g', kcal_100 => 116, protein_100 => 26,
    carbs_100 => 0, fat_100 => 1.2, barcode => '7801234567894')$$,
  '23505',
  null,
  'a barcode belongs to one food only (HU-09 CA5)'
);

select throws_ok(
  $$select public.create_food(name => 'Mala', basis => 'g', kcal_100 => 950, protein_100 => 0,
    carbs_100 => 0, fat_100 => 100)$$,
  '23514',
  null,
  'the per-100 g limits still apply'
);

select throws_ok(
  $$select public.create_food(name => 'Mala', basis => 'g', kcal_100 => 100, protein_100 => 1,
    carbs_100 => 1, fat_100 => 1, portions => '[{"name": "1 unidad", "grams": 0}]')$$,
  '23514',
  null,
  'a portion needs grams, and a bad portion undoes the whole food'
);

select is(
  (select count(*)::int from public.foods where name = 'Mala'),
  0,
  'nothing was left half saved'
);

reset role;
set local role anon;
select throws_ok(
  $$select public.create_food(name => 'Anónimo', basis => 'g', kcal_100 => 1, protein_100 => 0,
    carbs_100 => 0, fat_100 => 0)$$,
  '42501',
  null,
  'anonymous visitors cannot create foods'
);

select * from finish();
rollback;
