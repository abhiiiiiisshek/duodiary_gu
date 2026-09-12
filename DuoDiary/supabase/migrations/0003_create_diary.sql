-- Creating a diary was two statements -- insert the diary, then insert yourself
-- as its first member -- and that is wrong in two ways.
--
-- First, the client reads the new row back to learn its id, and PostgREST does
-- that read under the SELECT policy, which only admits members. At that instant
-- there are none, so a perfectly legitimate insert was rejected and rolled back.
--
-- Second, even had it worked, a failure between the two statements would leave a
-- diary with an owner but no members: visible to nobody, deletable by nobody.
--
-- One function does both, atomically, and hands back the id.

create or replace function public.create_diary(title text, invite_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  if exists (select 1 from diary_members where user_id = auth.uid()) then
    raise exception 'you already belong to a diary';
  end if;

  insert into diaries (owner_id, title, invite_code)
  values (
    auth.uid(),
    coalesce(nullif(trim(title), ''), 'Our Living Pages'),
    upper(invite_code)
  )
  returning id into new_id;

  insert into diary_members (diary_id, user_id) values (new_id, auth.uid());

  return new_id;
end $$;

-- An owner should be able to see their own diary whether or not the membership
-- row exists yet. Belt and braces for the case above.
create policy "owner reads own diary" on public.diaries
  for select using (owner_id = auth.uid());
