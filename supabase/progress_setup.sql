-- =====================================================================
-- Committee + session-end tracking
-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run
-- Safe to re-run.
-- =====================================================================

-- 1. Extra bill columns, filled in daily by scripts/update_bill_progress.py
alter table public.bills
  add column if not exists session_id     integer,
  add column if not exists in_committee   boolean not null default false,
  add column if not exists committee_name text;

-- 2. Legislative sessions, with LegiScan's "sine die" flag
--    (sine_die = true means the session has officially adjourned)
create table if not exists public.sessions (
  session_id    integer primary key,
  state         text not null,
  session_name  text,
  session_title text,
  year_start    integer,
  year_end      integer,
  special       boolean not null default false,
  sine_die      boolean not null default false,
  updated_at    timestamptz not null default now()
);

alter table public.sessions enable row level security;

revoke insert, update, delete on public.sessions from anon, authenticated;
grant select on public.sessions to anon, authenticated;

drop policy if exists "Anyone can read sessions" on public.sessions;
create policy "Anyone can read sessions"
  on public.sessions for select to anon, authenticated
  using (true);
