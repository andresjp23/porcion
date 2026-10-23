-- L-5: "Repetir lo de ayer" (HU-07). Copies the user's logs of one meal to
-- another day with the same portion, quantity and snapshot (CA2). Security
-- invoker: the food_logs policies apply, consent included. Returns how many
-- logs were copied.
create function public.copy_meal(from_date date, to_date date, m public.meal_type)
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
      food_id, log_date, meal, portion_id, quantity, grams, food_name, kcal, protein, carbs, fat, created_at
    )
    -- One millisecond apart, so the copies keep their order in Hoy.
    select food_id, to_date, m, portion_id, quantity, grams, food_name, kcal, protein, carbs, fat,
      now() + ord * interval '1 millisecond'
    from source
    returning 1
  )
  select count(*)::int from copied;
$$;

revoke execute on function public.copy_meal(date, date, public.meal_type) from public, anon;
grant execute on function public.copy_meal(date, date, public.meal_type) to authenticated;
