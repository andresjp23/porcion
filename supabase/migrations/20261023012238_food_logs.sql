-- L-1: the daily log (HU-03) with a snapshot of what was eaten (R-02), plus the
-- pieces that were waiting for it: day_summary, recent_foods (from B-3), usage
-- in the search ranking (B-3) and the "nobody else logged it" part of the
-- author's edit window (R-11, B-7).

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  -- The user's local date (design §2), computed in the client.
  log_date date not null,
  meal public.meal_type not null,
  portion_id uuid references public.food_portions (id) on delete set null,
  -- Number of portions, or grams when there is no portion.
  quantity numeric(7, 2) not null check (quantity > 0),
  grams numeric(8, 2) not null check (grams > 0),
  -- R-02 snapshot: editing the food later does not change the history.
  food_name text not null check (char_length(food_name) between 1 and 200),
  kcal numeric(8, 2) not null check (kcal >= 0),
  protein numeric(8, 2) not null check (protein >= 0),
  carbs numeric(8, 2) not null check (carbs >= 0),
  fat numeric(8, 2) not null check (fat >= 0),
  created_at timestamptz not null default now()
);

comment on table public.food_logs is 'What the user ate, with a snapshot of its nutrients (R-02).';

create index food_logs_user_date on public.food_logs (user_id, log_date);
-- recent_foods and the edit window look logs up by food.
create index food_logs_food on public.food_logs (food_id, user_id);

alter table public.food_logs enable row level security;

revoke all on public.food_logs from anon;

create policy "food_logs: read own"
  on public.food_logs for select
  to authenticated
  using (user_id = (select auth.uid()));

-- What someone eats is health data: like weight_entries, only after consent.
create policy "food_logs: insert own after consent"
  on public.food_logs for insert
  to authenticated
  with check (user_id = (select auth.uid()) and (select public.has_consented()));

create policy "food_logs: update own after consent"
  on public.food_logs for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.has_consented()));

create policy "food_logs: delete own"
  on public.food_logs for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- HU-03: totals of a day by meal. Meals without logs are left out.
create function public.day_summary(d date)
returns table (
  meal public.meal_type,
  entries int,
  kcal numeric,
  protein numeric,
  carbs numeric,
  fat numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.meal, count(*)::int, sum(l.kcal), sum(l.protein), sum(l.carbs), sum(l.fat)
  from public.food_logs l
  where l.user_id = (select auth.uid()) and l.log_date = d
  group by l.meal
  order by l.meal;
$$;

-- HU-04 CA2: foods the user logged, most recent first, one row per food.
create function public.recent_foods(lim int default 20)
returns setof public.food_list_items
language sql
stable
security invoker
set search_path = ''
as $$
  select v.*
  from (
    select distinct on (l.food_id) l.food_id, l.created_at
    from public.food_logs l
    where l.user_id = (select auth.uid()) and l.food_id is not null
    order by l.food_id, l.created_at desc
  ) as last
  join public.food_list_items v on v.id = last.food_id
  order by last.created_at desc, v.id
  limit greatest(1, least(coalesce(lim, 20), 50));
$$;

revoke execute on function public.day_summary(date) from public, anon;
revoke execute on function public.recent_foods(int) from public, anon;
grant execute on function public.day_summary(date) to authenticated;
grant execute on function public.recent_foods(int) to authenticated;

-- R-11, complete: also closed once someone else has logged the food.
create or replace function public.can_edit_food(target_food_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.foods f
    where f.id = target_food_id
      and f.created_by = (select auth.uid())
      and f.created_at > now() - interval '24 hours'
      and not exists (
        select 1 from public.food_logs l
        where l.food_id = f.id and l.user_id <> (select auth.uid())
      )
  );
$$;

-- B-3 ranking, now with usage last: among equal matches, the foods the user
-- logs most come first. RLS limits the count to the user's own logs.
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
  left join lateral (
    select count(*) as uses from public.food_logs l where l.food_id = m.id
  ) as usage on true
  order by m.tier, m.similarity desc, m.verified desc, usage.uses desc, m.name, m.id
  limit greatest(1, least(coalesce(lim, 20), 50));
$$;
