-- DuoDiary schema.
--
-- The product's promises are enforced here, in row-level security, not only in
-- the browser: a partner's entry is unreadable until the chapter opens, a past
-- day cannot be edited by anyone, and private reflections are visible to a
-- single row owner and to nobody else -- including the diary owner.
--
-- Timezones: a "day" is the writer's local day, which Postgres cannot infer.
-- The client therefore stores each chapter's own local midnight (closes_at) and
-- local unlock hour (unlock_at) as timestamptz, and every rule compares against
-- now(). No server-side date maths, no UTC drift.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 80),
  avatar        text,
  joined_date   date not null default current_date,
  -- Vault passphrase material. Public by design: useless without the passphrase.
  vault_salt    text,
  vault_verifier jsonb,
  created_at    timestamptz not null default now()
);

-- --------------------------------------------------------------- diaries

create table public.diaries (
  id              uuid primary key default gen_random_uuid(),
  title           text not null default 'Our Living Pages',
  description     text not null default '',
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  invite_code     text not null unique,
  delayed_sharing boolean not null default true,
  unlock_hour     smallint not null default 24 check (unlock_hour between 0 and 24),
  theme           text not null default 'moonlit',
  ambient_sound   text not null default 'rain',
  ambient_volume  real not null default 0.3,
  reduced_motion  boolean not null default false,
  created_at      timestamptz not null default now()
);

create table public.diary_members (
  diary_id  uuid not null references public.diaries(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (diary_id, user_id)
);

create index on public.diary_members (user_id);

-- A diary is a pair, never a group.
create or replace function public.enforce_two_members()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.diary_members where diary_id = new.diary_id) >= 2 then
    raise exception 'a diary holds at most two people';
  end if;
  return new;
end $$;

create trigger diary_members_max_two
  before insert on public.diary_members
  for each row execute function public.enforce_two_members();

-- -------------------------------------------------------------- chapters

create table public.chapters (
  id          uuid primary key default gen_random_uuid(),
  diary_id    uuid not null references public.diaries(id) on delete cascade,
  date        date not null,               -- the writer's local calendar day
  day_number  integer not null default 1,
  title       text not null default '',
  milestone_tag text,
  closes_at   timestamptz not null,        -- that day's local midnight
  unlock_at   timestamptz not null,        -- that day's local unlock hour
  created_at  timestamptz not null default now(),
  unique (diary_id, date)
);

create index on public.chapters (diary_id, date desc);

create table public.entries (
  id           uuid primary key default gen_random_uuid(),
  chapter_id   uuid not null references public.chapters(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  body         text not null default '',
  mood         text not null default 'reflective',
  location     text,
  attachments  jsonb not null default '[]'::jsonb,
  is_completed boolean not null default false,
  submitted_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (chapter_id, user_id)
);

create index on public.entries (chapter_id);

-- ----------------------------------------------------------- reflections

create table public.reflections (
  id            uuid primary key default gen_random_uuid(),
  diary_id      uuid not null references public.diaries(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  chapter_date  date not null,
  ciphertext    text not null,             -- AES-GCM, key never leaves the browser
  iv            text not null,
  topic_tag     text not null default 'Personal Reflection',
  time_lock     text not null default 'immediate',
  unlock_at     timestamptz,               -- null means never
  created_at    timestamptz not null default now()
);

create index on public.reflections (user_id, created_at desc);

-- --------------------------------------------------------------- threads

create table public.threads (
  id            uuid primary key default gen_random_uuid(),
  diary_id      uuid not null references public.diaries(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  slug          text not null,             -- stable key for upserts
  name          text not null,
  category      text not null,
  description   text not null default '',
  first_seen    date not null,
  last_seen     date not null,
  mention_count integer not null default 1,
  status        text not null default 'evolving',
  emotional_arc text[] not null default '{}',
  key_moments   jsonb not null default '[]'::jsonb,
  unique (user_id, diary_id, slug)
);

-- ================================================================ helpers
-- security definer so a policy can ask "is the caller a member?" without the
-- caller needing read access to the very table the answer comes from.

create or replace function public.is_member(target_diary uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from diary_members
    where diary_id = target_diary and user_id = auth.uid()
  );
$$;

create or replace function public.member_count(target_diary uuid)
returns integer language sql security definer stable set search_path = public as $$
  select count(*)::int from diary_members where diary_id = target_diary;
$$;

/*
 * The delayed-sharing rule, in one place, server side.
 * A chapter is open when: the diary has one member (nobody to wait for), or
 * delayed sharing is off, or the day has ended, or its unlock hour has passed,
 * or every member has submitted.
 */
create or replace function public.chapter_is_open(target_chapter uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select
    case
      when c.id is null then false
      when member_count(c.diary_id) < 2 then true
      when not d.delayed_sharing then true
      when now() >= c.closes_at then true
      when now() >= c.unlock_at then true
      else (
        select count(*) filter (where e.is_completed) >= member_count(c.diary_id)
        from entries e where e.chapter_id = c.id
      )
    end
  from chapters c
  join diaries d on d.id = c.diary_id
  where c.id = target_chapter;
$$;

/*
 * You may edit your own entry until your day ends -- and, in a pair, only while
 * the chapter is still shut. Once it opens you have read your partner's version,
 * and editing yours afterwards would make it a reply instead of a second truth.
 */
create or replace function public.chapter_is_editable(target_chapter uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select c.closes_at > now()
     and (member_count(c.diary_id) < 2 or not chapter_is_open(c.id))
  from chapters c
  where c.id = target_chapter;
$$;

-- ============================================================ row security

alter table public.profiles      enable row level security;
alter table public.diaries       enable row level security;
alter table public.diary_members enable row level security;
alter table public.chapters      enable row level security;
alter table public.entries       enable row level security;
alter table public.reflections   enable row level security;
alter table public.threads       enable row level security;

-- profiles: yourself, plus whoever shares a diary with you (to show their name)
create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

create policy "read partner profile" on public.profiles
  for select using (exists (
    select 1
    from public.diary_members mine
    join public.diary_members theirs on theirs.diary_id = mine.diary_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  ));

create policy "write own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "create own profile" on public.profiles
  for insert with check (id = auth.uid());

-- diaries: members read, owner writes
create policy "members read diary" on public.diaries
  for select using (public.is_member(id));

create policy "create own diary" on public.diaries
  for insert with check (owner_id = auth.uid());

create policy "owner updates diary" on public.diaries
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner deletes diary" on public.diaries
  for delete using (owner_id = auth.uid());

-- membership: members see the roster; joining goes through redeem_invite()
create policy "members read roster" on public.diary_members
  for select using (public.is_member(diary_id));

create policy "owner seeds membership" on public.diary_members
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.diaries d where d.id = diary_id and d.owner_id = auth.uid())
  );

-- chapters: members read and create; nobody rewrites a finished day
create policy "members read chapters" on public.chapters
  for select using (public.is_member(diary_id));

create policy "members create chapters" on public.chapters
  for insert with check (public.is_member(diary_id) and closes_at > now());

create policy "members touch open chapters" on public.chapters
  for update using (public.is_member(diary_id) and closes_at > now())
  with check (public.is_member(diary_id) and closes_at > now());

/*
 * Entries. This is the policy the product is built on: your partner's row is
 * invisible to you until the chapter opens. Not hidden in the UI -- absent from
 * the query result.
 */
create policy "read own entry" on public.entries
  for select using (user_id = auth.uid());

create policy "read partner entry only once open" on public.entries
  for select using (
    user_id <> auth.uid()
    and exists (
      select 1 from public.chapters c
      where c.id = entries.chapter_id and public.is_member(c.diary_id)
    )
    and public.chapter_is_open(entries.chapter_id)
  );

create policy "write own entry" on public.entries
  for insert with check (
    user_id = auth.uid() and public.chapter_is_editable(chapter_id)
  );

create policy "edit own entry while the day is open" on public.entries
  for update using (user_id = auth.uid() and public.chapter_is_editable(chapter_id))
  with check (user_id = auth.uid() and public.chapter_is_editable(chapter_id));

-- reflections: one owner, no exceptions. The ciphertext would be useless anyway.
create policy "own reflections only" on public.reflections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- threads are derived from your own writing, including your private pages
create policy "own threads only" on public.threads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================ invitations

/*
 * Redeeming an invitation needs to read a diary the caller cannot yet see, so it
 * runs as definer -- and therefore validates everything itself: the code must
 * match, the diary must have a free chair, and the caller must not already be in
 * another diary. Returns the diary id.
 */
create or replace function public.redeem_invite(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  target public.diaries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select * into target from diaries where upper(invite_code) = upper(trim(code));
  if not found then
    raise exception 'that invitation code does not match any diary';
  end if;

  if exists (select 1 from diary_members where diary_id = target.id and user_id = auth.uid()) then
    return target.id;
  end if;

  if (select count(*) from diary_members where diary_id = target.id) >= 2 then
    raise exception 'this diary already holds two people';
  end if;

  insert into diary_members (diary_id, user_id) values (target.id, auth.uid());

  -- Give the new member a blank entry in every chapter that is still open.
  insert into entries (chapter_id, user_id)
  select c.id, auth.uid() from chapters c
  where c.diary_id = target.id and c.closes_at > now()
  on conflict do nothing;

  return target.id;
end $$;

/*
 * A signed-in person may hand ownership to the other member, and only to them.
 */
create or replace function public.transfer_ownership(target_diary uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  successor uuid;
begin
  if not exists (select 1 from diaries where id = target_diary and owner_id = auth.uid()) then
    raise exception 'only the owner may transfer a diary';
  end if;

  select user_id into successor from diary_members
  where diary_id = target_diary and user_id <> auth.uid() limit 1;

  if successor is null then
    raise exception 'there is nobody to transfer this diary to';
  end if;

  update diaries set owner_id = successor where id = target_diary;
end $$;

-- A profile row is created for every new account, so the app never has a
-- signed-in user with nowhere to put their name.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Realtime: a sealed entry should appear on the other side without a refresh.
alter publication supabase_realtime add table public.entries;
alter publication supabase_realtime add table public.chapters;
