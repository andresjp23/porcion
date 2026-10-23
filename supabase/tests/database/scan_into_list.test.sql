begin;
select plan(9);

insert into auth.users (id, email) values
  ('66666666-6666-6666-6666-666666666661', 'scanner@example.com'),
  ('66666666-6666-6666-6666-666666666662', 'other@example.com');

insert into public.foods (id, name, kcal_100, protein_100, carbs_100, fat_100, barcode, source, verified, created_by)
values ('f0000000-0000-0000-0000-000000000001', 'Leche Entera Test', 61, 3.2, 4.7, 3.3, '96385074', 'seed', true, null);

insert into public.shopping_lists (id, user_id) values
  ('a0000000-0000-0000-0000-000000000001', '66666666-6666-6666-6666-666666666661'),
  ('a0000000-0000-0000-0000-000000000002', '66666666-6666-6666-6666-666666666662');
insert into public.shopping_list_items (id, list_id, label) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'leche'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'ajeno');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "66666666-6666-6666-6666-666666666661"}', true);

select is(
  public.scan_into_list(
    list_id => 'a0000000-0000-0000-0000-000000000001', barcode => '96385074',
    label => 'Leche Entera Test', food_id => 'f0000000-0000-0000-0000-000000000001',
    claim_item_id => 'b0000000-0000-0000-0000-000000000001'
  ),
  '{"item_id": "b0000000-0000-0000-0000-000000000001", "outcome": "claimed"}'::jsonb,
  'a matched item takes the scan (HU-12 CA2)'
);

select results_eq(
  $$select label, barcode, food_id, checked_at is not null, quantity
    from public.shopping_list_items where id = 'b0000000-0000-0000-0000-000000000001'$$,
  $$values ('leche'::text, '96385074'::text, 'f0000000-0000-0000-0000-000000000001'::uuid, true, 1)$$,
  'the claimed item keeps its label, gets the code and the food, and is checked'
);

select is(
  public.scan_into_list(
    list_id => 'a0000000-0000-0000-0000-000000000001', barcode => '96385074', label => 'Otra vez'
  ) ->> 'outcome',
  'repeat',
  'the same code again is a repeat (HU-12 CA6)'
);

select is(
  (select quantity from public.shopping_list_items where id = 'b0000000-0000-0000-0000-000000000001'),
  2,
  'a repeat raises the quantity instead of adding an item'
);

select is(
  public.scan_into_list(
    list_id => 'a0000000-0000-0000-0000-000000000001', barcode => '7801234567894',
    label => ' Código 780 1234 567894 '
  ) ->> 'outcome',
  'added',
  'a code that matches nothing is added'
);

select results_eq(
  $$select label, source, checked_at is not null, food_id from public.shopping_list_items
    where barcode = '7801234567894'$$,
  $$values ('Código 780 1234 567894'::text, 'scan'::text, true, null::uuid)$$,
  'as a checked scan item, pending while the code has no food'
);

select is(
  public.scan_into_list(
    list_id => 'a0000000-0000-0000-0000-000000000001', barcode => '7809990000013',
    label => 'Nuevo', claim_item_id => 'b0000000-0000-0000-0000-000000000001'
  ) ->> 'outcome',
  'added',
  'an item that already has a code cannot be claimed again'
);

select throws_ok(
  $$select public.scan_into_list(
    list_id => 'a0000000-0000-0000-0000-000000000002', barcode => '7809990000020', label => 'Intruso')$$,
  '42501',
  null,
  'cannot scan into someone else''s list'
);

select public.scan_into_list(
  list_id => 'a0000000-0000-0000-0000-000000000001', barcode => '7809990000020', label => 'Mío',
  claim_item_id => 'b0000000-0000-0000-0000-000000000002'
);
reset role;
select is(
  (select barcode from public.shopping_list_items where id = 'b0000000-0000-0000-0000-000000000002'),
  null,
  'an item of someone else''s list cannot be claimed'
);

select * from finish();
rollback;
