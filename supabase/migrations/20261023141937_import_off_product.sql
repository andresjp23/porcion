-- S-2: import a product read from Open Food Facts into the shared base (R-10).
-- The client fetches OFF and sends the values here. Security definer, because
-- the foods policies only let users insert their own 'user' rows; this is the
-- one way in for 'off' rows, so it validates what it gets: a valid barcode,
-- the table's ranges and a loose 4/4/9 (isImportable in src/domain/validation.ts:
-- within the larger of 50 kcal and 30 %). The row has no author.
--
-- Idempotent: when the barcode is already in the base (two users scanning the
-- same product at once), it returns that food instead of failing. The optional
-- portion is the label's serving ("1 porción").

create function public.import_off_product(
  barcode text,
  name text,
  basis public.food_basis,
  kcal_100 numeric,
  protein_100 numeric,
  carbs_100 numeric,
  fat_100 numeric,
  brand text default null,
  serving_grams numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  food_id uuid;
  estimated numeric := 4 * import_off_product.protein_100 + 4 * import_off_product.carbs_100
    + 9 * import_off_product.fat_100;
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if not coalesce(public.is_valid_gtin(import_off_product.barcode), false) then
    raise exception 'invalid barcode' using errcode = '22023';
  end if;

  select f.id into food_id from public.foods f where f.barcode = import_off_product.barcode;
  if found then
    return food_id;
  end if;

  if abs(import_off_product.kcal_100 - estimated) > greatest(50, 0.3 * import_off_product.kcal_100) then
    raise exception 'kcal do not match the macros' using errcode = '22023';
  end if;
  if import_off_product.serving_grams is not null
    and not (import_off_product.serving_grams > 0 and import_off_product.serving_grams <= 2000) then
    raise exception 'serving out of range' using errcode = '22023';
  end if;

  begin
    insert into public.foods (
      name, brand, basis, kcal_100, protein_100, carbs_100, fat_100, barcode, source, created_by
    )
    values (
      btrim(import_off_product.name),
      nullif(btrim(import_off_product.brand), ''),
      import_off_product.basis,
      import_off_product.kcal_100,
      import_off_product.protein_100,
      import_off_product.carbs_100,
      import_off_product.fat_100,
      import_off_product.barcode,
      'off',
      null
    )
    returning id into food_id;
  exception when unique_violation then
    -- Someone imported it between the lookup and the insert.
    select f.id into food_id from public.foods f where f.barcode = import_off_product.barcode;
    return food_id;
  end;

  if import_off_product.serving_grams is not null then
    insert into public.food_portions (food_id, name, grams, is_default)
    values (food_id, '1 porción', import_off_product.serving_grams, true);
  end if;

  return food_id;
end;
$$;

revoke execute on function public.import_off_product(text, text, public.food_basis, numeric, numeric, numeric, numeric, text, numeric)
  from public, anon;
grant execute on function public.import_off_product(text, text, public.food_basis, numeric, numeric, numeric, numeric, text, numeric)
  to authenticated;
