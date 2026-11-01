-- ItalFUT | 202611020001_security_hardening.sql
-- Additive, idempotent hardening. Safe to run on the existing project:
--   * no rows are deleted or rewritten;
--   * new CHECK constraints are NOT VALID (enforced on new/updated rows only).
-- Apply with: Supabase Dashboard → SQL Editor → paste & run (or `supabase db push`).
begin;

-- 1) Data minimisation: profiles.full_name was never collected by the UI.
create or replace function private.sync_profile() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare chosen_username text;
begin
  chosen_username := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if chosen_username !~ '^[a-z0-9_]{3,30}$' then
    chosen_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;
  insert into public.profiles (id, username, email)
  values (new.id, chosen_username, lower(new.email))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
revoke all on function private.sync_profile() from public, anon, authenticated;
alter table public.profiles drop column if exists full_name;

-- 2) Username availability for the sign-up form (boolean only, never emails).
create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select lower(coalesce(p_username, '')) ~ '^[a-z0-9_]{3,30}$'
     and lower(p_username) not in ('admin','administrator','root','support','help','italfut','staff','moderator','system','api')
     and not exists (select 1 from public.profiles p where p.username = lower(p_username));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- 3) Login throttling used by the auth-username Edge Function (service role only).
create table if not exists private.login_attempts (
  id bigint generated always as identity primary key,
  bucket text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists login_attempts_bucket_idx on private.login_attempts (bucket, attempted_at desc);
revoke all on private.login_attempts from public, anon, authenticated;

create or replace function public.auth_throttle(p_bucket text, p_max integer default 8, p_window_seconds integer default 900)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare recent integer;
begin
  delete from private.login_attempts where attempted_at < now() - interval '1 day';
  select count(*) into recent from private.login_attempts
   where bucket = p_bucket and attempted_at > now() - make_interval(secs => p_window_seconds);
  if recent >= p_max then return false; end if;
  insert into private.login_attempts(bucket) values (left(p_bucket, 200));
  return true;
end;
$$;
revoke all on function public.auth_throttle(text, integer, integer) from public, anon, authenticated;
grant execute on function public.auth_throttle(text, integer, integer) to service_role;

create or replace function public.auth_throttle_reset(p_bucket text)
returns void language sql security definer set search_path = ''
as $$ delete from private.login_attempts where bucket = p_bucket; $$;
revoke all on function public.auth_throttle_reset(text) from public, anon, authenticated;
grant execute on function public.auth_throttle_reset(text) to service_role;

-- 4) Anonymous visitors only read the columns public pages display.
--    owner_id (an auth user id) and minors' audit columns stay private.
revoke select on public.tenants from anon;
grant select (id, slug, name, tagline, logo_url, cover_url, brand_color, status, created_at) on public.tenants to anon;
revoke select on public.players from anon;
grant select (id, tenant_id, team_id, first_name, last_name, shirt_number, position, profile_image_url, age_category, created_at) on public.players to anon;

-- 5) Defence in depth against stored XSS / tracking pixels via URL fields:
--    only absolute https URLs, bounded length. NOT VALID = existing rows untouched.
do $$
declare entry record;
begin
  for entry in select * from (values
    ('tenants','logo_url'), ('tenants','cover_url'), ('teams','logo_url'),
    ('players','profile_image_url'), ('staff_members','photo_url'), ('awards','image_url'),
    ('sponsors','logo_url'), ('sponsors','image_url'), ('sponsors','website_url'),
    ('articles','image_url'), ('market_slots','photo_url'), ('galleries','url')
  ) as t(table_name, column_name)
  loop
    if not exists (select 1 from pg_constraint where conname = entry.table_name || '_' || entry.column_name || '_https') then
      -- The pattern is passed as a literal (%L) so no manual quote escaping is needed.
      execute format(
        'alter table public.%I add constraint %I check (%I is null or (%I ~* %L and char_length(%I) <= 2048)) not valid',
        entry.table_name, entry.table_name || '_' || entry.column_name || '_https',
        entry.column_name, entry.column_name, '^https://[^[:space:]<>"'']+$', entry.column_name);
    end if;
  end loop;
end;
$$;

-- 6) Reasonable text bounds (prevents abuse of storage and rendering).
do $$
declare entry record;
begin
  for entry in select * from (values
    ('tenants','tagline',160), ('competitions','season_label',80), ('competitions','statistics_group',80),
    ('matches','matchday',60), ('matches','venue',160), ('match_events','note',500),
    ('staff_members','name',120), ('staff_members','role',120), ('awards','title',160), ('awards','month_label',60),
    ('sponsors','name',120), ('sponsors','description',2000), ('articles','title',200), ('articles','summary',4000),
    ('articles','body',20000), ('articles','image_alt',300), ('sponsors','image_alt',300),
    ('market_slots','player_name',120), ('market_slots','notes',2000), ('galleries','label',160),
    ('players','first_name',80), ('players','last_name',80)
  ) as t(table_name, column_name, max_len)
  loop
    if not exists (select 1 from pg_constraint where conname = entry.table_name || '_' || entry.column_name || '_len') then
      execute format('alter table public.%I add constraint %I check (%I is null or char_length(%I) <= %s) not valid',
        entry.table_name, entry.table_name || '_' || entry.column_name || '_len', entry.column_name, entry.column_name, entry.max_len);
    end if;
  end loop;
end;
$$;

-- 7) Functions keep a pinned search_path and no implicit PUBLIC execute.
revoke all on function public.create_tenant(text,text,integer,text[]) from public, anon;
revoke all on function public.request_upgrade(uuid,integer,text[]) from public, anon;
revoke all on function public.delete_my_tenant(uuid,text) from public, anon;

commit;
