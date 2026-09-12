-- Google (and any other OAuth provider) does not send a `display_name`; it sends
-- `full_name` / `name` and an `avatar_url`. Without this a person signing in with
-- Google would be called by the local part of their email address and have no
-- picture.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'someone@unknown'), '@', 1)
    ),
    nullif(coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Backfill anyone who already signed in before this ran.
update public.profiles p
set display_name = coalesce(
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      p.display_name
    ),
    avatar = coalesce(p.avatar, nullif(u.raw_user_meta_data ->> 'avatar_url', ''))
from auth.users u
where u.id = p.id
  and (p.avatar is null or p.display_name = split_part(u.email, '@', 1));
