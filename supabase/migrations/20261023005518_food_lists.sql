-- B-4: lists for the Favoritos and Mis alimentos tabs of Agregar alimento
-- (HU-04 CA2). Rows have the same shape as search_foods, so the screen renders
-- every list the same way.

-- A food with its default portion. security_invoker: RLS of the caller applies.
create view public.food_list_items
with (security_invoker = true)
as
select
  f.id, f.name, f.brand, f.basis, f.kcal_100, f.protein_100, f.carbs_100, f.fat_100,
  f.source, f.verified, f.open_reports,
  p.id as default_portion_id,
  p.name as default_portion_name,
  p.grams as default_portion_grams
from public.foods f
left join public.food_portions p on p.food_id = f.id and p.is_default;

revoke all on public.food_list_items from anon;

-- The user's favorites, most recently marked first.
create function public.favorite_foods()
returns setof public.food_list_items
language sql
stable
security invoker
set search_path = ''
as $$
  select v.*
  from public.favorites fav
  join public.food_list_items v on v.id = fav.food_id
  where fav.user_id = (select auth.uid())
  order by fav.created_at desc, v.id;
$$;

-- Foods the user created, newest first. Security definer because B-7 hides
-- foods.created_by from clients; it only ever matches the caller's own id.
create function public.my_foods()
returns setof public.food_list_items
language sql
stable
security definer
set search_path = ''
as $$
  select v.*
  from public.foods f
  join public.food_list_items v on v.id = f.id
  where f.created_by = (select auth.uid())
  order by f.created_at desc, f.id;
$$;

revoke execute on function public.favorite_foods() from public, anon;
revoke execute on function public.my_foods() from public, anon;
grant execute on function public.favorite_foods() to authenticated;
grant execute on function public.my_foods() to authenticated;
