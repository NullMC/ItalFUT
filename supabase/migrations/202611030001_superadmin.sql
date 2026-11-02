-- ItalFUT | 202611030001_superadmin.sql
-- Platform superadmin: full CRUD on every application table through audited,
-- SECURITY DEFINER functions. Client roles keep their narrow grants and RLS;
-- only accounts listed in public.platform_admins can call the admin_* functions.
--
-- First superadmin (run once in the SQL Editor, with YOUR username):
--   insert into public.platform_admins(user_id)
--   select id from public.profiles where username = 'il_tuo_username';
--
-- Idempotent: safe to run more than once.
begin;

-- 1) Who is a superadmin, and what they did.
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid,
  action text not null check (action in ('insert', 'update', 'delete', 'set_password')),
  table_name text not null,
  row_key jsonb,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;

create or replace function private.is_platform_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.platform_admins where user_id = (select auth.uid())); $$;
revoke all on function private.is_platform_admin() from public, anon, authenticated;

create or replace function public.am_i_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select private.is_platform_admin(); $$;
revoke all on function public.am_i_admin() from public, anon;
grant execute on function public.am_i_admin() to authenticated;

create or replace function private.require_admin() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'Accesso riservato al superadmin' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.require_admin() from public, anon, authenticated;

-- 2) Tables the dashboard may manage (whitelist). Anything else is refused.
create or replace function private.admin_table(p_table text) returns regclass
language plpgsql stable set search_path = ''
as $$
begin
  if p_table is null or p_table not in (
    'profiles','tenants','tenant_members','feature_catalog','tenant_features','plan_quotes',
    'upgrade_requests','subscriptions','competitions','teams','competition_teams','players',
    'matches','match_events','staff_members','awards','sponsors','articles','market_slots',
    'galleries','support_requests','platform_admins','admin_audit_log'
  ) then
    raise exception 'Tabella non gestibile: %', coalesce(p_table, 'null') using errcode = '42P01';
  end if;
  return ('public.' || quote_ident(p_table))::regclass;
end;
$$;
revoke all on function private.admin_table(text) from public, anon, authenticated;

create or replace function private.pk_columns(p_rel regclass) returns text[]
language sql stable set search_path = ''
as $$
  select array_agg(a.attname::text order by array_position(i.indkey::int2[], a.attnum))
  from pg_catalog.pg_index i
  join pg_catalog.pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
  where i.indrelid = p_rel and i.indisprimary;
$$;
revoke all on function private.pk_columns(regclass) from public, anon, authenticated;

-- 3) Schema description used to build tabs, tables and forms.
create or replace function public.admin_schema() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb := '{}'::jsonb; t text; rel regclass;
begin
  perform private.require_admin();
  foreach t in array array[
    'profiles','tenants','tenant_members','feature_catalog','tenant_features','plan_quotes',
    'upgrade_requests','subscriptions','competitions','teams','competition_teams','players',
    'matches','match_events','staff_members','awards','sponsors','articles','market_slots',
    'galleries','support_requests','platform_admins','admin_audit_log']
  loop
    rel := private.admin_table(t);
    result := result || jsonb_build_object(t, jsonb_build_object(
      'pk', to_jsonb(private.pk_columns(rel)),
      'columns', (
        select jsonb_agg(jsonb_build_object(
          'name', c.column_name, 'type', c.data_type, 'udt', c.udt_name,
          'nullable', c.is_nullable = 'YES', 'default', c.column_default,
          'identity', c.is_identity = 'YES', 'generated', c.is_generated <> 'NEVER')
          order by c.ordinal_position)
        from information_schema.columns c
        where c.table_schema = 'public' and c.table_name = t),
      'references', coalesce((
        select jsonb_object_agg(local_col, ref_table) from (
          select distinct on (la.attname) la.attname::text as local_col,
                 case when ft.relnamespace = 'auth'::regnamespace and ft.relname = 'users' then 'profiles' else ft.relname::text end as ref_table
          from pg_catalog.pg_constraint con
          join pg_catalog.pg_class ft on ft.oid = con.confrelid
          cross join lateral unnest(con.conkey, con.confkey) as k(lk, fk)
          join pg_catalog.pg_attribute la on la.attrelid = con.conrelid and la.attnum = k.lk
          join pg_catalog.pg_attribute fa on fa.attrelid = con.confrelid and fa.attnum = k.fk
          where con.conrelid = rel and con.contype = 'f'
            and (la.attname <> 'tenant_id' or ft.relname = 'tenants')
          order by la.attname, array_length(con.conkey, 1) desc
        ) refs), '{}'::jsonb),
      'checks', coalesce((
        select jsonb_agg(pg_catalog.pg_get_constraintdef(con.oid))
        from pg_catalog.pg_constraint con where con.conrelid = rel and con.contype = 'c'), '[]'::jsonb)
    ));
  end loop;
  return result;
end;
$$;
revoke all on function public.admin_schema() from public, anon;
grant execute on function public.admin_schema() to authenticated;

-- 4) Read: paginated, optional full-text-ish search over the whole row.
create or replace function public.admin_list(p_table text, p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  rel regclass := private.admin_table(p_table);
  has_created boolean;
  order_by text;
  filter text := '';
  total bigint;
  rows jsonb;
begin
  perform private.require_admin();
  p_limit := least(greatest(coalesce(p_limit, 50), 1), 1000);
  p_offset := greatest(coalesce(p_offset, 0), 0);
  select exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = p_table and column_name = 'created_at') into has_created;
  order_by := case when has_created then 't.created_at desc' else (select string_agg(format('t.%I', c), ', ') from unnest(private.pk_columns(rel)) c) end;
  if nullif(btrim(coalesce(p_search, '')), '') is not null then
    filter := format('where t::text ilike %L', '%' || replace(replace(btrim(p_search), '%', '\%'), '_', '\_') || '%');
  end if;
  execute format('select count(*) from %s t %s', rel, filter) into total;
  execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from (select t.* from %s t %s order by %s limit %s offset %s) t',
                 rel, filter, order_by, p_limit, p_offset) into rows;
  return jsonb_build_object('rows', rows, 'total', total);
end;
$$;
revoke all on function public.admin_list(text, text, integer, integer) from public, anon;
grant execute on function public.admin_list(text, text, integer, integer) to authenticated;

-- 5) Create / update. p_key = primary key of the row to update (null → insert).
--    Only columns that exist in the table are used; values are cast by Postgres.
create or replace function public.admin_save(p_table text, p_row jsonb, p_key jsonb default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  rel regclass := private.admin_table(p_table);
  pk text[] := private.pk_columns(rel);
  cols text[];
  col_list text;
  key_match text;
  old_row jsonb;
  new_row jsonb;
begin
  perform private.require_admin();
  if p_table in ('admin_audit_log') then raise exception 'Il registro attività è in sola lettura'; end if;
  if p_table = 'profiles' and p_key is null then raise exception 'I profili si creano con la registrazione dal sito'; end if;
  if p_row is null or jsonb_typeof(p_row) <> 'object' then raise exception 'Dati non validi'; end if;

  select array_agg(c.column_name::text order by c.ordinal_position) into cols
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = p_table
    and c.is_identity = 'NO' and c.is_generated = 'NEVER'
    and p_row ? c.column_name
    and not (p_table = 'profiles' and c.column_name in ('id', 'email', 'username'));
  if cols is null then raise exception 'Nessun campo da salvare'; end if;
  col_list := (select string_agg(format('%I', c), ', ') from unnest(cols) c);

  if p_key is null then
    execute format('insert into %s (%s) select %s from jsonb_populate_record(null::%s, $1) returning to_jsonb(%s.*)',
                   rel, col_list, col_list, rel, rel)
      using p_row into new_row;
    insert into public.admin_audit_log(admin_id, action, table_name, row_key, after)
    values (auth.uid(), 'insert', p_table, (select jsonb_object_agg(k, new_row -> k) from unnest(pk) k), new_row);
    -- A tournament created here gets the same setup as one created from the console.
    if p_table = 'tenants' then
      insert into public.tenant_members(tenant_id, user_id, role)
      values ((new_row ->> 'id')::uuid, (new_row ->> 'owner_id')::uuid, 'owner') on conflict do nothing;
      insert into public.tenant_features(tenant_id, code, enabled, source)
      select (new_row ->> 'id')::uuid, code, true, 'included' from public.feature_catalog where is_core
      on conflict do nothing;
    end if;
  else
    key_match := (select string_agg(format('t.%I = k.%I', c, c), ' and ') from unnest(pk) c);
    execute format('select to_jsonb(t) from %s t, jsonb_populate_record(null::%s, $1) k where %s', rel, rel, key_match)
      using p_key into old_row;
    if old_row is null then raise exception 'Record non trovato'; end if;
    execute format('update %s t set (%s) = (select %s from jsonb_populate_record(null::%s, $1)) from jsonb_populate_record(null::%s, $2) k where %s returning to_jsonb(t.*)',
                   rel, col_list, col_list, rel, rel, key_match)
      using p_row, p_key into new_row;
    insert into public.admin_audit_log(admin_id, action, table_name, row_key, before, after)
    values (auth.uid(), 'update', p_table, p_key, old_row, new_row);
  end if;
  return new_row;
end;
$$;
revoke all on function public.admin_save(text, jsonb, jsonb) from public, anon;
grant execute on function public.admin_save(text, jsonb, jsonb) to authenticated;

-- 6) Delete. Deleting a profile deletes the account (auth.users) and cascades.
create or replace function public.admin_delete(p_table text, p_key jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  rel regclass := private.admin_table(p_table);
  pk text[] := private.pk_columns(rel);
  key_match text;
  old_row jsonb;
begin
  perform private.require_admin();
  if p_table = 'admin_audit_log' then raise exception 'Il registro attività è in sola lettura'; end if;
  if p_key is null then raise exception 'Chiave mancante'; end if;
  key_match := (select string_agg(format('t.%I = k.%I', c, c), ' and ') from unnest(pk) c);
  execute format('select to_jsonb(t) from %s t, jsonb_populate_record(null::%s, $1) k where %s', rel, rel, key_match)
    using p_key into old_row;
  if old_row is null then raise exception 'Record non trovato'; end if;

  if p_table = 'platform_admins' and (select count(*) from public.platform_admins) <= 1 then
    raise exception 'Non puoi rimuovere l''ultimo superadmin';
  end if;
  if p_table = 'profiles' then
    if (old_row ->> 'id')::uuid = auth.uid() then raise exception 'Non puoi eliminare il tuo stesso account da qui'; end if;
    if exists(select 1 from public.tenants where owner_id = (old_row ->> 'id')::uuid) then
      raise exception 'L''utente possiede dei tornei: eliminali o cambia proprietario prima';
    end if;
    delete from public.upgrade_requests where requested_by = (old_row ->> 'id')::uuid;
    delete from auth.users where id = (old_row ->> 'id')::uuid;
  else
    execute format('delete from %s t using jsonb_populate_record(null::%s, $1) k where %s', rel, rel, key_match) using p_key;
  end if;
  insert into public.admin_audit_log(admin_id, action, table_name, row_key, before)
  values (auth.uid(), 'delete', p_table, p_key, old_row);
end;
$$;
revoke all on function public.admin_delete(text, jsonb) from public, anon;
grant execute on function public.admin_delete(text, jsonb) to authenticated;

-- 7) Account helpers.
create or replace function public.admin_set_password(p_user_id uuid, p_password text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  if p_password is null or char_length(p_password) < 10 or octet_length(p_password) > 72 then
    raise exception 'La password deve avere da 10 a 72 caratteri';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)), updated_at = now()
   where id = p_user_id;
  if not found then raise exception 'Utente non trovato'; end if;
  delete from auth.sessions where user_id = p_user_id;
  insert into public.admin_audit_log(admin_id, action, table_name, row_key)
  values (auth.uid(), 'set_password', 'profiles', jsonb_build_object('id', p_user_id));
end;
$$;
revoke all on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;

-- 8) Overview numbers for the dashboard home.
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'tenants', (select count(*) from public.tenants),
    'tenants_by_status', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from public.tenants group by status) s),
    'matches', (select count(*) from public.matches),
    'players', (select count(*) from public.players),
    'open_requests', (select count(*) from public.support_requests where status = 'open'),
    'pending_upgrades', (select count(*) from public.upgrade_requests where status = 'pending'),
    'signups_by_week', (select coalesce(jsonb_agg(jsonb_build_object('week', w, 'count', n) order by w), '[]') from (
        select date_trunc('week', created_at)::date w, count(*) n from public.profiles
        where created_at > now() - interval '12 weeks' group by 1) s)
  );
end;
$$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

commit;
