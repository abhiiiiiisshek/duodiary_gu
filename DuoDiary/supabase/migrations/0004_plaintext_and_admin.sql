-- Two deliberate changes to what this product promises. Both are reductions in
-- privacy, made on purpose, and the app now says so in plain words rather than
-- claiming a guarantee the code no longer provides.
--
-- 1. Private reflections are stored as readable text.
--    They used to be AES-GCM ciphertext under a passphrase that never left the
--    browser, which meant nobody -- not the partner, not the operator, not a
--    court order -- could read them. That is gone. `body` holds the words.
--
-- 2. An operator can read everything.
--    A row in `admins` grants SELECT on every table for that account: every
--    diary, every sealed entry before it opens, every private reflection before
--    its time lock expires.
--
-- Membership in `admins` is granted ONLY from the SQL editor or with the
-- service_role key. There is deliberately no INSERT policy, so no browser
-- session can promote itself however the client is tampered with.

-- --------------------------------------------------- reflections in the clear

alter table public.reflections add column if not exists body text not null default '';

-- Rows written under the old scheme stay exactly as they are. Their key never
-- existed on the server, so there is nothing here that could decrypt them; they
-- are kept rather than dropped so no writing is destroyed by this migration.
alter table public.reflections alter column ciphertext drop not null;
alter table public.reflections alter column iv drop not null;

comment on column public.reflections.ciphertext is
  'Legacy. Unreadable AES-GCM from before 0004; new rows write body instead.';
comment on column public.reflections.body is
  'The reflection, in the clear. Readable by its author and by any admin.';

-- The vault passphrase has nothing left to protect.
alter table public.profiles drop column if exists vault_salt;
alter table public.profiles drop column if exists vault_verifier;

-- ------------------------------------------------------------------- admins

create table if not exists public.admins (
  user_id  uuid primary key references auth.users on delete cascade,
  note     text not null default '',
  added_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- An account may check whether it is an admin. Nothing may write this table
-- through PostgREST at all: no insert, update or delete policy exists.
create policy "read own admin row" on public.admins
  for select using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select true from admins where user_id = auth.uid()), false);
$$;

-- Permissive policies OR together with the ones in 0001, so these add a second
-- way in for admins and change nothing for everybody else.
create policy "admins read all profiles"   on public.profiles      for select using (public.is_admin());
create policy "admins read all diaries"    on public.diaries       for select using (public.is_admin());
create policy "admins read all rosters"    on public.diary_members for select using (public.is_admin());
create policy "admins read all chapters"   on public.chapters      for select using (public.is_admin());
create policy "admins read all entries"    on public.entries       for select using (public.is_admin());
create policy "admins read all reflections" on public.reflections  for select using (public.is_admin());
create policy "admins read all threads"    on public.threads       for select using (public.is_admin());

-- Read, and only read. An admin cannot write in anyone's diary, seal an entry,
-- or edit a past day -- the 0001 write policies still require authorship, and
-- nothing above grants insert, update or delete.
