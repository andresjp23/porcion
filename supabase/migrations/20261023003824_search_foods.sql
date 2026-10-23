-- B-3: food search (HU-04 CA3). Ignores accents and case, matches name, brand
-- and aliases, and tolerates typos. Ranking: name prefix > word prefix (an
-- alias or a later word) > similarity > verified. Usage joins the ranking in
-- L-1, once food_logs exists, together with recent_foods.

create function public.search_foods(q text, lim int default 20)
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
      f.*,
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

comment on function public.search_foods(text, int) is
  'Food search for HU-04 (design §2). At most 50 results; respects RLS.';

revoke execute on function public.search_foods(text, int) from public, anon;
grant execute on function public.search_foods(text, int) to authenticated;
