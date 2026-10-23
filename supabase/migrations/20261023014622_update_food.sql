-- B-7b: the author edits a community food during its window (R-11).

-- A log that pointed at a deleted portion would read its quantity as grams
-- ("2 porciones" → "2 g"). Before the portion goes, its logs switch to plain
-- grams; their snapshot (R-02) does not change. Security definer: the
-- maintainer may delete portions that other users logged.
create function public.food_portions_detach_logs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.food_logs
  set quantity = grams, portion_id = null
  where portion_id = old.id;
  return old;
end;
$$;

create trigger food_portions_detach_logs
  before delete on public.food_portions
  for each row execute function public.food_portions_detach_logs();

-- Same arguments as create_food, plus the food. Portions with an "id" are
-- updated, new ones inserted and missing ones deleted; the first is the
-- default. Security invoker, so the foods and food_portions policies decide
-- (can_edit_food). Raises 42501 once the window has closed.
create function public.update_food(
  food_id uuid,
  name text,
  basis public.food_basis,
  kcal_100 numeric,
  protein_100 numeric,
  carbs_100 numeric,
  fat_100 numeric,
  brand text default null,
  portions jsonb default '[]'
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(update_food.portions) <> 'array' then
    raise exception 'portions must be a JSON array' using errcode = '22023';
  end if;

  update public.foods f
  set
    name = btrim(update_food.name),
    brand = nullif(btrim(update_food.brand), ''),
    basis = update_food.basis,
    kcal_100 = update_food.kcal_100,
    protein_100 = update_food.protein_100,
    carbs_100 = update_food.carbs_100,
    fat_100 = update_food.fat_100
  where f.id = update_food.food_id;

  if not found then
    raise exception 'this food can no longer be edited' using errcode = '42501';
  end if;

  delete from public.food_portions p
  where p.food_id = update_food.food_id
    and p.id not in (
      select (e ->> 'id')::uuid
      from jsonb_array_elements(update_food.portions) as e
      where e ? 'id'
    );

  -- Clear the default first: at most one per food (food_portions_one_default).
  update public.food_portions p set is_default = false
  where p.food_id = update_food.food_id and p.is_default;

  update public.food_portions p
  set name = btrim(e.value ->> 'name'), grams = (e.value ->> 'grams')::numeric, is_default = e.ord = 1
  from jsonb_array_elements(update_food.portions) with ordinality as e (value, ord)
  where e.value ? 'id' and p.id = (e.value ->> 'id')::uuid and p.food_id = update_food.food_id;

  insert into public.food_portions (food_id, name, grams, is_default)
  select update_food.food_id, btrim(e.value ->> 'name'), (e.value ->> 'grams')::numeric, e.ord = 1
  from jsonb_array_elements(update_food.portions) with ordinality as e (value, ord)
  where not e.value ? 'id';
end;
$$;

revoke execute on function public.update_food(uuid, text, public.food_basis, numeric, numeric, numeric, numeric, text, jsonb)
  from public, anon;
grant execute on function public.update_food(uuid, text, public.food_basis, numeric, numeric, numeric, numeric, text, jsonb)
  to authenticated;
