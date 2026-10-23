-- B-6: create a community food with its portions in one transaction (HU-09).
-- Security invoker, so the RLS of B-1 applies: source 'user', authored by the
-- caller, and portions only while the author may edit the food. The first
-- portion is the default one.

create function public.create_food(
  name text,
  basis public.food_basis,
  kcal_100 numeric,
  protein_100 numeric,
  carbs_100 numeric,
  fat_100 numeric,
  brand text default null,
  barcode text default null,
  portions jsonb default '[]'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if jsonb_typeof(create_food.portions) <> 'array' then
    raise exception 'portions must be a JSON array' using errcode = '22023';
  end if;

  insert into public.foods (name, brand, basis, kcal_100, protein_100, carbs_100, fat_100, barcode, source)
  values (
    btrim(create_food.name),
    nullif(btrim(create_food.brand), ''),
    create_food.basis,
    create_food.kcal_100,
    create_food.protein_100,
    create_food.carbs_100,
    create_food.fat_100,
    nullif(btrim(create_food.barcode), ''),
    'user'
  )
  returning id into new_id;

  insert into public.food_portions (food_id, name, grams, is_default)
  select new_id, btrim(p ->> 'name'), (p ->> 'grams')::numeric, ord = 1
  from jsonb_array_elements(create_food.portions) with ordinality as t (p, ord);

  return new_id;
end;
$$;

revoke execute on function public.create_food(text, public.food_basis, numeric, numeric, numeric, numeric, text, text, jsonb)
  from public, anon;
grant execute on function public.create_food(text, public.food_basis, numeric, numeric, numeric, numeric, text, text, jsonb)
  to authenticated;
