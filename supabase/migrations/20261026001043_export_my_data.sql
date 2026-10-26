-- U-2: "Descargar mis datos" (HU-16 CA1, derecho de acceso y portabilidad).
-- Everything stored about the caller, as one JSON document: account, profile,
-- weights, logs, favorites, shopping lists, the foods they contributed (with
-- portions) and their reports. Security definer because created_by is not
-- readable by clients (B-7) and the email lives in auth.users; every part is
-- filtered by auth.uid(), so it only ever returns the caller's own data.
create function public.export_my_data()
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

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
