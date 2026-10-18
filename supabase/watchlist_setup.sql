-- =====================================================================
-- Watchlist + staff review setup
-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- =====================================================================

-- 1. New columns for the review workflow -------------------------------
alter table public.bills
  add column if not exists watchlist_status text not null default 'pending',
  add column if not exists position        text,
  add column if not exists manual_category text,
  add column if not exists plain_summary   text,
  add column if not exists benefits        text,
  add column if not exists risks           text,
  add column if not exists last_edited_by  text,
  add column if not exists last_edited_at  timestamptz;

-- Only allow the values the website uses
alter table public.bills drop constraint if exists bills_watchlist_status_check;
alter table public.bills add constraint bills_watchlist_status_check
  check (watchlist_status in ('pending', 'watch', 'archived'));

alter table public.bills drop constraint if exists bills_position_check;
alter table public.bills add constraint bills_position_check
  check (position is null or position in ('support', 'neutral', 'oppose'));

-- 2. Automatically record who edited a bill and when ------------------
-- (Only for staff edits made through the website, not the nightly sync.)
create or replace function public.stamp_bill_editor()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    new.last_edited_by := auth.jwt() ->> 'email';
    new.last_edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists stamp_bill_editor on public.bills;
create trigger stamp_bill_editor
  before update on public.bills
  for each row execute function public.stamp_bill_editor();

-- 3. Who can do what --------------------------------------------------
-- Public visitors and staff can never insert or delete bills, and staff
-- can only change the review columns (not titles, statuses, etc.).
revoke insert, update, delete on public.bills from anon, authenticated;
grant select on public.bills to anon, authenticated;
grant update (watchlist_status, position, manual_category, plain_summary, benefits, risks)
  on public.bills to authenticated;

-- Replace all existing row-level policies on bills with the new ones
alter table public.bills enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'bills'
  loop
    execute format('drop policy %I on public.bills', p.policyname);
  end loop;
end $$;

-- Public (not signed in): only Colorado bills on the watchlist
create policy "Public can read watchlist bills"
  on public.bills for select to anon
  using (state = 'CO' and watchlist_status = 'watch');

-- Signed-in staff: read every bill, and edit the review columns
create policy "Staff can read all bills"
  on public.bills for select to authenticated
  using (true);

create policy "Staff can update review fields"
  on public.bills for update to authenticated
  using (true) with check (true);
