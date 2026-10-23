begin;
select plan(13);

insert into auth.users (id, email) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'author@example.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'someone@example.com');

insert into public.foods (id, name, kcal_100, protein_100, carbs_100, fat_100, source, created_by, created_at)
values
  ('d0000000-0000-0000-0000-000000000001', 'Queque nuevo', 380, 6, 50, 17, 'user',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', now() - interval '2 hours'),
  ('d0000000-0000-0000-0000-000000000002', 'Queque viejo', 380, 6, 50, 17, 'user',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', now() - interval '25 hours');
update public.foods set updated_at = now() - interval '1 hour'
  where id = 'd0000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2"}', true);

-- Another user.
select throws_ok(
  $$select created_by from public.foods$$,
  '42501',
  null,
  'nobody reads the author of a food (R-11)'
);

select is(
  (select name from public.foods where id = 'd0000000-0000-0000-0000-000000000001'),
  'Queque nuevo',
  'every other column stays readable'
);

select ok(
  not public.is_my_food('d0000000-0000-0000-0000-000000000001'),
  'is_my_food is false for someone else''s food'
);

select is_empty(
  $$update public.foods set kcal_100 = 1 where id = 'd0000000-0000-0000-0000-000000000001' returning id$$,
  'only the author edits a community food'
);

select is(
  (select count(*)::int from public.search_foods('queque')
   where id::text like 'd0000000-%'),
  2,
  'search_foods still works without reading created_by'
);

-- The author.
select set_config('request.jwt.claims', '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1"}', true);

select ok(
  public.is_my_food('d0000000-0000-0000-0000-000000000001'),
  'is_my_food is true for the author'
);

select isnt_empty(
  $$update public.foods set kcal_100 = 370, name = 'Queque de vainilla'
    where id = 'd0000000-0000-0000-0000-000000000001' returning id$$,
  'the author edits the food during its first 24 h (R-11)'
);

select ok(
  (select updated_at > now() - interval '1 minute' from public.foods
   where id = 'd0000000-0000-0000-0000-000000000001'),
  'editing bumps updated_at'
);

select is_empty(
  $$update public.foods set kcal_100 = 1 where id = 'd0000000-0000-0000-0000-000000000002' returning id$$,
  'after 24 h the author can no longer edit it (R-11)'
);

select throws_ok(
  $$update public.foods set verified = true where id = 'd0000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'the author cannot mark their food as verified'
);

select throws_ok(
  $$update public.foods set source = 'seed' where id = 'd0000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'the author cannot change the source'
);

select throws_ok(
  $$update public.foods set open_reports = 0 where id = 'd0000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'the author cannot clear the report count'
);

select throws_ok(
  $$update public.foods set created_by = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'
    where id = 'd0000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'the author cannot hand the food to someone else'
);

select * from finish();
rollback;
