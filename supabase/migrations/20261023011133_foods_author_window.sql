-- B-7: R-11 for foods. Other users never see who authored a food, and only the
-- author edits it, during its first 24 h. The "nobody else logged it" part of
-- the window is added to can_edit_food in L-1, once food_logs exists.

-- Hide the author: select on every column but created_by. Code that needs it
-- goes through security definer functions (can_edit_food, my_foods, is_my_food).
revoke select on public.foods from authenticated;
grant select (
  id, name, brand, aliases, search_text, basis, kcal_100, protein_100, carbs_100, fat_100,
  barcode, source, verified, open_reports, created_at, updated_at
) on public.foods to authenticated;

-- What the author may change. source, verified, created_by and open_reports
-- stay out of reach, so a community food cannot pass itself off as verified.
revoke update on public.foods from authenticated;
grant update (name, brand, basis, kcal_100, protein_100, carbs_100, fat_100, barcode)
  on public.foods to authenticated;

create policy "foods: author edits while editable"
  on public.foods for update
  to authenticated
  using ((select public.can_edit_food(id)))
  with check ((select public.can_edit_food(id)));

-- "¿Es mío?" for the Detail, without exposing created_by.
create function public.is_my_food(target_food_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.foods
    where id = target_food_id and created_by = (select auth.uid())
  );
$$;

revoke execute on function public.is_my_food(uuid) from public, anon;
grant execute on function public.is_my_food(uuid) to authenticated;
grant execute on function public.can_edit_food(uuid) to authenticated;

-- search_foods read f.*, which now includes a column the caller cannot read.
-- Same function, with the columns listed.
create or replace function public.search_foods(q text, lim int default 20)
returns table (
  id uuid,
  name text,
  brand text,
  basis public.food_basis,
  kcal_100 numeric,
  protein_100 numeric,
  carbs_100 numeric,
  fat_100 numeric,
  source public.food_source,
  verified boolean,
  open_reports int,
  default_portion_id uuid,
  default_portion_name text,
  default_portion_grams numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with query as (
    select
      term,
      -- Escaped for LIKE, so % and _ typed by the user match literally.
      replace(replace(replace(term, '\', '\\'), '%', '\%'), '_', '\_') as pattern
    from (select public.unaccent_immutable(lower(btrim(coalesce(q, ''))))) as t (term)
  ),
  matches as (
    select
      f.id, f.name, f.brand, f.basis, f.kcal_100, f.protein_100, f.carbs_100, f.fat_100,
      f.source, f.verified, f.open_reports,
      case
        when f.search_text like query.pattern || '%' then 0
        when ' ' || f.search_text like '% ' || query.pattern || '%' then 1
        else 2
      end as tier,
      extensions.strict_word_similarity(query.term, f.search_text) as similarity
    from public.foods f, query
    where query.term <> ''
      and (
        f.search_text like '%' || query.pattern || '%'
        -- Typos: "platno" → "plátano" scores 0.5 and "frutila" → "frutilla"
        -- 0.7, while unrelated words stay at 0.25 or less. The <<% operator
        -- would use the index, but its threshold (0.5) cannot be set inside a
        -- function on Supabase, so this branch scans the table.
        or extensions.strict_word_similarity(query.term, f.search_text) >= 0.5
      )
  )
  select
    m.id, m.name, m.brand, m.basis, m.kcal_100, m.protein_100, m.carbs_100, m.fat_100,
    m.source, m.verified, m.open_reports,
    p.id, p.name, p.grams
  from matches m
  left join public.food_portions p on p.food_id = m.id and p.is_default
  order by m.tier, m.similarity desc, m.verified desc, m.name, m.id
  limit greatest(1, least(coalesce(lim, 20), 50));
$$;
