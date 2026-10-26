-- MP-2: meal prep (HU-17 to HU-19, R-14). A batch cooked at home, private to
-- its owner: raw ingredients with a per-100 g snapshot, the net cooked weight
-- and optional servings. What is left and whether it finished are not stored:
-- the client derives them (src/domain/mealPrep.ts) from logged_grams, so
-- editing or deleting a log never leaves a stale counter.

create table public.meal_preps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  -- The user's local date (R-15), computed in the client like food_logs.log_date.
  cooked_on date not null,
  -- Net, weighed with tare. Null falls back to the raw weight (HU-17 CA3).
  cooked_grams numeric(8, 2) check (cooked_grams between 1 and 20000),
  servings int check (servings between 1 and 50),
  -- "Se terminó" (HU-19 CA1). Running out finishes a batch without it.
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.meal_preps is 'A batch cooked at home and eaten over days; private (HU-17).';

create index meal_preps_user_id on public.meal_preps (user_id, created_at desc);

create trigger meal_preps_set_updated_at
  before update on public.meal_preps
  for each row execute function public.set_updated_at();

alter table public.meal_preps enable row level security;

revoke all on public.meal_preps from anon;

create policy "meal_preps: read own"
  on public.meal_preps for select
  to authenticated
  using (user_id = (select auth.uid()));

-- What someone cooks to eat is health data: like food_logs, only after consent.
create policy "meal_preps: insert own after consent"
  on public.meal_preps for insert
  to authenticated
  with check (user_id = (select auth.uid()) and (select public.has_consented()));

create policy "meal_preps: update own after consent"
  on public.meal_preps for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.has_consented()));

create policy "meal_preps: delete own"
  on public.meal_preps for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Raw ingredients. Their per-100 g values are a snapshot taken when added, so
-- a later fix in the shared base does not change a batch already cooked (R-14).
create table public.meal_prep_ingredients (
  id uuid primary key default gen_random_uuid(),
  meal_prep_id uuid not null references public.meal_preps (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  food_name text not null check (char_length(btrim(food_name)) between 1 and 200),
  grams numeric(8, 2) not null check (grams between 1 and 10000),
  kcal_100 numeric(6, 2) not null check (kcal_100 between 0 and 900),
  protein_100 numeric(5, 2) not null check (protein_100 between 0 and 100),
  carbs_100 numeric(5, 2) not null check (carbs_100 between 0 and 100),
  fat_100 numeric(5, 2) not null check (fat_100 between 0 and 100),
  position int not null check (position >= 0),
  constraint meal_prep_ingredients_macros_within_100 check (protein_100 + carbs_100 + fat_100 <= 100)
);

create index meal_prep_ingredients_meal_prep_id on public.meal_prep_ingredients (meal_prep_id, position);
create index meal_prep_ingredients_food_id on public.meal_prep_ingredients (food_id);

alter table public.meal_prep_ingredients enable row level security;

revoke all on public.meal_prep_ingredients from anon;

create policy "meal_prep_ingredients: read own"
  on public.meal_prep_ingredients for select
  to authenticated
  using (exists (
    select 1 from public.meal_preps p
    where p.id = meal_prep_id and p.user_id = (select auth.uid())
  ));

create policy "meal_prep_ingredients: insert own after consent"
  on public.meal_prep_ingredients for insert
  to authenticated
  with check (
    exists (
      select 1 from public.meal_preps p
      where p.id = meal_prep_id and p.user_id = (select auth.uid())
    )
    and (select public.has_consented())
  );

create policy "meal_prep_ingredients: update own after consent"
  on public.meal_prep_ingredients for update
  to authenticated
  using (exists (
    select 1 from public.meal_preps p
    where p.id = meal_prep_id and p.user_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.meal_preps p
      where p.id = meal_prep_id and p.user_id = (select auth.uid())
    )
    and (select public.has_consented())
  );

create policy "meal_prep_ingredients: delete own"
  on public.meal_prep_ingredients for delete
  to authenticated
  using (exists (
    select 1 from public.meal_preps p
    where p.id = meal_prep_id and p.user_id = (select auth.uid())
  ));

-- R-14: at most 30 ingredients per batch, also for writes outside save_meal_prep.
-- A row trigger sees the rows inserted before it in the same statement.
create function public.meal_prep_ingredients_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.meal_prep_ingredients i where i.meal_prep_id = new.meal_prep_id) >= 30 then
    raise exception 'a meal prep has at most 30 ingredients' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger meal_prep_ingredients_limit
  before insert on public.meal_prep_ingredients
  for each row execute function public.meal_prep_ingredients_limit();

-- HU-18: a log can come from a batch. Its grams count against what is left.
alter table public.food_logs
  add column meal_prep_id uuid references public.meal_preps (id) on delete set null;

create index food_logs_meal_prep_id on public.food_logs (meal_prep_id);

-- A foreign key does not check RLS, so the write policies make sure a log only
-- points at one of the user's own batches.
drop policy "food_logs: insert own after consent" on public.food_logs;
drop policy "food_logs: update own after consent" on public.food_logs;

create policy "food_logs: insert own after consent"
  on public.food_logs for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.has_consented())
    and (meal_prep_id is null or exists (
      select 1 from public.meal_preps p
      where p.id = meal_prep_id and p.user_id = (select auth.uid())
    ))
  );

create policy "food_logs: update own after consent"
  on public.food_logs for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (select public.has_consented())
    and (meal_prep_id is null or exists (
      select 1 from public.meal_preps p
      where p.id = meal_prep_id and p.user_id = (select auth.uid())
    ))
  );

-- HU-17: creates a batch (prep_id null) or replaces one, ingredients included,
-- in one transaction. Ingredients come as
-- [{food_id?, food_name, grams, kcal_100, protein_100, carbs_100, fat_100}]
-- in display order. Security invoker: the policies above apply, consent
-- included. Returns the batch id.
create function public.save_meal_prep(
  prep_id uuid,
  name text,
  cooked_on date,
  cooked_grams numeric,
  servings int,
  ingredients jsonb
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  if jsonb_typeof(ingredients) is distinct from 'array'
    or jsonb_array_length(ingredients) not between 1 and 30 then
    raise exception 'a meal prep needs between 1 and 30 ingredients' using errcode = 'check_violation';
  end if;

  if prep_id is null then
    insert into public.meal_preps (name, cooked_on, cooked_grams, servings)
    values (btrim(save_meal_prep.name), save_meal_prep.cooked_on, save_meal_prep.cooked_grams, save_meal_prep.servings)
    returning id into saved_id;
  else
    update public.meal_preps p
    set name = btrim(save_meal_prep.name),
        cooked_on = save_meal_prep.cooked_on,
        cooked_grams = save_meal_prep.cooked_grams,
        servings = save_meal_prep.servings
    where p.id = prep_id
    returning p.id into saved_id;

    if saved_id is null then
      raise exception 'meal prep not found' using errcode = 'no_data_found';
    end if;

    delete from public.meal_prep_ingredients i where i.meal_prep_id = saved_id;
  end if;

  insert into public.meal_prep_ingredients (
    meal_prep_id, food_id, food_name, grams, kcal_100, protein_100, carbs_100, fat_100, position
  )
  select
    saved_id,
    nullif(item ->> 'food_id', '')::uuid,
    btrim(item ->> 'food_name'),
    (item ->> 'grams')::numeric,
    (item ->> 'kcal_100')::numeric,
    (item ->> 'protein_100')::numeric,
    (item ->> 'carbs_100')::numeric,
    (item ->> 'fat_100')::numeric,
    (ord - 1)::int
  from jsonb_array_elements(ingredients) with ordinality as e (item, ord);

  return saved_id;
end;
$$;

-- HU-18 CA1, HU-19: the user's batches, newest first, with their ingredients
-- and the grams already logged. Everything else is derived in the client.
create function public.my_meal_preps()
returns table (
  id uuid,
  name text,
  cooked_on date,
  cooked_grams numeric,
  servings int,
  finished_at timestamptz,
  created_at timestamptz,
  ingredients jsonb,
  logged_grams numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id, p.name, p.cooked_on, p.cooked_grams, p.servings, p.finished_at, p.created_at,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'food_id', i.food_id, 'food_name', i.food_name, 'grams', i.grams,
          'kcal_100', i.kcal_100, 'protein_100', i.protein_100,
          'carbs_100', i.carbs_100, 'fat_100', i.fat_100
        )
        order by i.position
      )
      from public.meal_prep_ingredients i where i.meal_prep_id = p.id
    ), '[]'),
    coalesce((select sum(l.grams) from public.food_logs l where l.meal_prep_id = p.id), 0)
  from public.meal_preps p
  where p.user_id = (select auth.uid())
  order by p.created_at desc, p.id;
$$;

revoke execute on function public.save_meal_prep(uuid, text, date, numeric, int, jsonb) from public, anon;
revoke execute on function public.my_meal_preps() from public, anon;
grant execute on function public.save_meal_prep(uuid, text, date, numeric, int, jsonb) to authenticated;
grant execute on function public.my_meal_preps() to authenticated;

-- HU-18 CA5: repeating yesterday keeps the link, so it counts against the batch.
create or replace function public.copy_meal(from_date date, to_date date, m public.meal_type)
returns int
language sql
volatile
security invoker
set search_path = ''
as $$
  with source as (
    select l.*, row_number() over (order by l.created_at, l.id) as ord
    from public.food_logs l
    where l.user_id = (select auth.uid()) and l.log_date = from_date and l.meal = m
  ),
  copied as (
    insert into public.food_logs (
      food_id, meal_prep_id, log_date, meal, portion_id, quantity, grams, food_name, kcal, protein, carbs, fat, created_at
    )
    -- One millisecond apart, so the copies keep their order in Hoy.
    select food_id, meal_prep_id, to_date, m, portion_id, quantity, grams, food_name, kcal, protein, carbs, fat,
      now() + ord * interval '1 millisecond'
    from source
    returning 1
  )
  select count(*)::int from copied;
$$;

-- HU-16 CA1: the export now includes the batches with their ingredients.
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select (select auth.uid()) as id
  )
  select jsonb_build_object(
    'exported_at', now(),
    'account', (
      select jsonb_build_object('email', u.email, 'created_at', u.created_at)
      from auth.users u where u.id = me.id
    ),
    'profile', (
      select to_jsonb(p) - 'id' from public.profiles p where p.id = me.id
    ),
    'weight_entries', coalesce((
      select jsonb_agg(to_jsonb(w) - 'user_id' order by w.date)
      from public.weight_entries w where w.user_id = me.id
    ), '[]'),
    'food_logs', coalesce((
      select jsonb_agg(to_jsonb(l) - 'user_id' order by l.log_date, l.created_at, l.id)
      from public.food_logs l where l.user_id = me.id
    ), '[]'),
    'meal_preps', coalesce((
      select jsonb_agg(
        (to_jsonb(mp) - 'user_id') || jsonb_build_object('ingredients', coalesce((
          select jsonb_agg(to_jsonb(i) - 'meal_prep_id' order by i.position)
          from public.meal_prep_ingredients i where i.meal_prep_id = mp.id
        ), '[]'))
        order by mp.created_at
      )
      from public.meal_preps mp where mp.user_id = me.id
    ), '[]'),
    'favorites', coalesce((
      select jsonb_agg(
        jsonb_build_object('food_id', f.food_id, 'food_name', foods.name, 'created_at', f.created_at)
        order by f.created_at
      )
      from public.favorites f join public.foods on foods.id = f.food_id
      where f.user_id = me.id
    ), '[]'),
    'shopping_lists', coalesce((
      select jsonb_agg(
        (to_jsonb(s) - 'user_id') || jsonb_build_object('items', coalesce((
          select jsonb_agg(to_jsonb(i) - 'list_id' order by i.created_at, i.id)
          from public.shopping_list_items i where i.list_id = s.id
        ), '[]'))
        order by s.created_at
      )
      from public.shopping_lists s where s.user_id = me.id
    ), '[]'),
    'contributed_foods', coalesce((
      select jsonb_agg(
        (to_jsonb(food) - 'created_by' - 'search_text' - 'open_reports')
          || jsonb_build_object('portions', coalesce((
            select jsonb_agg(to_jsonb(fp) - 'food_id' order by fp.is_default desc, fp.name)
            from public.food_portions fp where fp.food_id = food.id
          ), '[]'))
        order by food.created_at
      )
      from public.foods food where food.created_by = me.id
    ), '[]'),
    'food_reports', coalesce((
      select jsonb_agg(to_jsonb(r) - 'reporter_id' order by r.created_at)
      from public.food_reports r where r.reporter_id = me.id
    ), '[]')
  )
  from me
  where me.id is not null;
$$;
