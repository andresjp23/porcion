begin;
select plan(10);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'scanner@example.com');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"}', true);

create temporary table imported (id uuid) on commit drop;
grant all on imported to authenticated;

insert into imported
select public.import_off_product(
  barcode => '7809990000013',
  name => ' Coca-Cola Original ',
  brand => 'Coca-Cola',
  basis => 'ml',
  kcal_100 => 42.4,
  protein_100 => 0,
  carbs_100 => 10.6,
  fat_100 => 0,
  serving_grams => 330
);

select results_eq(
  $$select name, brand, basis::text, source::text, verified from public.foods
    where id = (select id from imported)$$,
  $$values ('Coca-Cola Original'::text, 'Coca-Cola'::text, 'ml'::text, 'off'::text, false)$$,
  'imports the product as an unverified Open Food Facts food (R-10)'
);

select results_eq(
  $$select name, grams, is_default from public.food_portions where food_id = (select id from imported)$$,
  $$values ('1 porción'::text, 330::numeric, true)$$,
  'keeps the label serving as the default portion'
);

select ok(
  not public.is_my_food((select id from imported)),
  'the imported food has no author'
);

select is(
  public.import_off_product(barcode => '7809990000013', name => 'Otra', basis => 'g',
    kcal_100 => 0, protein_100 => 0, carbs_100 => 0, fat_100 => 0),
  (select id from imported),
  'a barcode already in the base returns that food instead of a copy'
);

select lives_ok(
  $$select public.import_off_product(barcode => '96385074', name => 'Sin porción', basis => 'g',
    kcal_100 => 380, protein_100 => 10, carbs_100 => 70, fat_100 => 5)$$,
  'the serving is optional'
);

select throws_ok(
  $$select public.import_off_product(barcode => '7801234567891', name => 'Malo', basis => 'g',
    kcal_100 => 100, protein_100 => 0, carbs_100 => 25, fat_100 => 0)$$,
  '22023',
  'invalid barcode',
  'rejects a barcode with a bad check digit'
);

select throws_ok(
  $$select public.import_off_product(barcode => '7801234567894', name => 'kJ', basis => 'g',
    kcal_100 => 600, protein_100 => 0, carbs_100 => 25, fat_100 => 0)$$,
  '22023',
  'kcal do not match the macros',
  'rejects values far from 4/4/9'
);

select throws_ok(
  $$select public.import_off_product(barcode => '7801234567894', name => 'Raro', basis => 'g',
    kcal_100 => 100, protein_100 => 0, carbs_100 => 25, fat_100 => 0, serving_grams => 0)$$,
  '22023',
  'serving out of range',
  'rejects an empty serving'
);

select throws_ok(
  $$insert into public.foods (name, basis, kcal_100, protein_100, carbs_100, fat_100, source, created_by)
    values ('Falso', 'g', 100, 0, 25, 0, 'off', null)$$,
  '42501',
  null,
  'users cannot insert Open Food Facts rows directly'
);

reset role;
set local role anon;
select throws_ok(
  $$select public.import_off_product(barcode => '7801234567894', name => 'Anon', basis => 'g',
    kcal_100 => 100, protein_100 => 0, carbs_100 => 25, fat_100 => 0)$$,
  '42501',
  null,
  'anonymous users cannot import'
);

select * from finish();
rollback;
