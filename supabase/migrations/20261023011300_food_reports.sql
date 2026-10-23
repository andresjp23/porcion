-- B-8: reports on community foods (HU-10) and the open_reports count behind
-- "Datos en revisión" (R-11). The maintainer resolves reports from the Supabase
-- dashboard by changing their status; nobody updates or deletes them from the app.

create table public.food_reports (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods (id) on delete cascade,
  reporter_id uuid default auth.uid() references auth.users (id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 1 and 280),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

comment on table public.food_reports is 'Reports of wrong data in community foods (HU-10).';

create index food_reports_food_id on public.food_reports (food_id);
-- One open report per user and food.
create unique index food_reports_one_open on public.food_reports (food_id, reporter_id)
  where status = 'open';

alter table public.food_reports enable row level security;

revoke all on public.food_reports from anon;
revoke update, delete on public.food_reports from authenticated;

create policy "food_reports: read own"
  on public.food_reports for select
  to authenticated
  using (reporter_id = (select auth.uid()));

-- HU-10 CA1: only community foods are reported; seed foods are curated by the
-- maintainer and Open Food Facts data is fixed at the source.
create policy "food_reports: report community foods"
  on public.food_reports for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open'
    and exists (select 1 from public.foods f where f.id = food_id and f.source = 'user')
  );

-- Keeps foods.open_reports in step. Security definer: users cannot update that
-- column themselves (B-7).
create function public.food_reports_count_open()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected uuid;
begin
  for affected in
    select distinct food_id from (
      select new.food_id where tg_op in ('INSERT', 'UPDATE')
      union all
      select old.food_id where tg_op in ('UPDATE', 'DELETE')
    ) as changed (food_id)
  loop
    update public.foods
    set open_reports = (
      select count(*) from public.food_reports r
      where r.food_id = affected and r.status = 'open'
    )
    where id = affected;
  end loop;
  return null;
end;
$$;

create trigger food_reports_count_open
  after insert or update or delete on public.food_reports
  for each row execute function public.food_reports_count_open();
