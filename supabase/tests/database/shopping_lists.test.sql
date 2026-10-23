begin;
select plan(14);

insert into auth.users (id, email) values
  ('55555555-5555-5555-5555-555555555551', 'shopper@example.com'),
  ('55555555-5555-5555-5555-555555555552', 'other@example.com');

insert into public.foods (id, name, kcal_100, protein_100, carbs_100, fat_100, barcode, source, verified, created_by)
values ('d0000000-0000-0000-0000-000000000001', 'Avena Lista', 370, 13, 60, 7, '96385074', 'seed', true, null);

-- The other user has a list with a pending code.
insert into public.shopping_lists (id, user_id, name) values
  ('e0000000-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555552', 'Ajena');
insert into public.shopping_list_items (list_id, label, barcode, source) values
  ('e0000000-0000-0000-0000-000000000002', 'Producto escaneado', '7801234567894', 'scan');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "55555555-5555-5555-5555-555555555551"}', true);

insert into public.shopping_lists (id) values ('e0000000-0000-0000-0000-000000000001');

select results_eq(
  $$select name, status::text, user_id from public.shopping_lists$$,
  $$values ('Compras'::text, 'active'::text, '55555555-5555-5555-5555-555555555551'::uuid)$$,
  'a new list is active, named Compras and owned by the user; other lists are hidden'
);

select throws_ok(
  $$insert into public.shopping_lists (name) values ('Segunda')$$,
  '23505',
  null,
  'only one active list at a time (HU-11 CA3)'
);

update public.shopping_lists set status = 'archived' where id = 'e0000000-0000-0000-0000-000000000001';
select lives_ok(
  $$insert into public.shopping_lists (id, name) values ('e0000000-0000-0000-0000-000000000003', 'Escaneo 23/10')$$,
  'archiving the active list makes room for a new one'
);

insert into public.shopping_list_items (list_id, label) values
  ('e0000000-0000-0000-0000-000000000003', 'leche');
insert into public.shopping_list_items (list_id, label, barcode, source) values
  ('e0000000-0000-0000-0000-000000000003', 'Avena', '96385074', 'scan'),
  ('e0000000-0000-0000-0000-000000000003', 'Producto escaneado', '7801234567894', 'scan');

select results_eq(
  $$select label, quantity, source, food_id from public.shopping_list_items order by source, label$$,
  $$values
    ('leche'::text, 1, 'manual'::text, null::uuid),
    ('Avena'::text, 1, 'scan'::text, 'd0000000-0000-0000-0000-000000000001'::uuid),
    ('Producto escaneado'::text, 1, 'scan'::text, null::uuid)$$,
  'items default to 1 manual unit, a known code links its food, and only own items show'
);

select throws_ok(
  $$insert into public.shopping_list_items (list_id, label, barcode, source)
    values ('e0000000-0000-0000-0000-000000000003', 'Avena otra vez', '96385074', 'scan')$$,
  '23505',
  null,
  'a code is one item per list (HU-12 CA6)'
);

select throws_ok(
  $$insert into public.shopping_list_items (list_id, label, barcode)
    values ('e0000000-0000-0000-0000-000000000003', 'Malo', '7801234567891')$$,
  '23514',
  null,
  'rejects a barcode with a bad check digit'
);

select throws_ok(
  $$insert into public.shopping_list_items (list_id, label, source)
    values ('e0000000-0000-0000-0000-000000000003', 'x', 'magic')$$,
  '23514',
  null,
  'source is manual or scan'
);

select throws_ok(
  $$insert into public.shopping_list_items (list_id, label)
    values ('e0000000-0000-0000-0000-000000000002', 'intruso')$$,
  '42501',
  null,
  'cannot add items to someone else''s list'
);

select is_empty(
  $$update public.shopping_lists set name = 'Mía' where id = 'e0000000-0000-0000-0000-000000000002' returning id$$,
  'cannot rename someone else''s list'
);

select throws_ok(
  $$update public.shopping_lists set user_id = '55555555-5555-5555-5555-555555555552'
    where id = 'e0000000-0000-0000-0000-000000000003'$$,
  '42501',
  null,
  'cannot hand a list to someone else'
);

-- Creating the food with the pending code links it for every user (HU-12 CA5).
select public.create_food(
  name => 'Galletas', basis => 'g', kcal_100 => 480, protein_100 => 6, carbs_100 => 65,
  fat_100 => 21, barcode => '7801234567894'
);

select is(
  (select count(*)::int from public.shopping_list_items where barcode = '7801234567894' and food_id is null),
  0,
  'creating a food links the user''s pending items with its code'
);

reset role;
select is(
  (select f.name from public.shopping_list_items i join public.foods f on f.id = i.food_id
   where i.list_id = 'e0000000-0000-0000-0000-000000000002'),
  'Galletas',
  'and the pending items of other users too'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "55555555-5555-5555-5555-555555555551"}', true);
delete from public.shopping_lists where id = 'e0000000-0000-0000-0000-000000000003';
reset role;
select is(
  (select count(*)::int from public.shopping_list_items where list_id = 'e0000000-0000-0000-0000-000000000003'),
  0,
  'deleting a list deletes its items'
);

set local role anon;
select throws_ok(
  $$select * from public.shopping_lists$$,
  '42501',
  null,
  'anonymous users cannot read lists'
);

select * from finish();
rollback;
