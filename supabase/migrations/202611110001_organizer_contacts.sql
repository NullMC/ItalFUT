-- Contact details of organizers: full name, email and phone.
-- * Optional at sign-up, required to create a tournament (free or paid) and to pay a plan,
--   so the platform can reach the organizer for support.
-- * Visible only to the user and to the superadmin. Never public, never shown to the staff
--   of the user's tournaments. Contact only: no email is ever sent (login stays username +
--   password, recovery with the one-time code).
-- * Deleted with the account (on delete cascade).
-- Run after 202611100001_promotion_codes.sql. Safe to run more than once.
begin;

create table if not exists public.organizer_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) between 2 and 120),
  email text check (email is null or (char_length(email) <= 254 and email ~* '^[^\s@]+@[^\s@]+\.[a-z]{2,}$')),
  phone text check (phone is null or phone ~ '^\+?[0-9]{6,15}$'),
  updated_at timestamptz not null default now()
);
alter table public.organizer_contacts enable row level security;
revoke all on public.organizer_contacts from anon, authenticated;
grant select on public.organizer_contacts to authenticated;
drop policy if exists "Own contact only" on public.organizer_contacts;
create policy "Own contact only" on public.organizer_contacts for select to authenticated
  using (user_id = (select auth.uid()));

-- Saves (or clears with empty values) the current user's contact details.
create or replace function public.save_my_contact(p_full_name text, p_email text, p_phone text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_name text := nullif(regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g'), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  -- Phone: keep digits and a leading +; "0039" becomes "+39".
  v_phone text := nullif(regexp_replace(trim(coalesce(p_phone, '')), '[^0-9+]', '', 'g'), '');
begin
  if v_user is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  if v_phone like '00%' then v_phone := '+' || substr(v_phone, 3); end if;
  if v_name is not null and char_length(v_name) not between 2 and 120 then raise exception 'Nome e cognome: da 2 a 120 caratteri'; end if;
  if v_email is not null and (char_length(v_email) > 254 or v_email !~* '^[^\s@]+@[^\s@]+\.[a-z]{2,}$') then raise exception 'Indirizzo email non valido'; end if;
  if v_phone is not null and v_phone !~ '^\+?[0-9]{6,15}$' then raise exception 'Numero di telefono non valido: usa solo cifre, con il prefisso internazionale se serve (es. +39 333 1234567)'; end if;
  insert into public.organizer_contacts(user_id, full_name, email, phone, updated_at)
    values (v_user, v_name, v_email, v_phone, now())
  on conflict (user_id) do update set full_name = excluded.full_name, email = excluded.email, phone = excluded.phone, updated_at = now();
  return jsonb_build_object('full_name', v_name, 'email', v_email, 'phone', v_phone);
end;
$$;
revoke all on function public.save_my_contact(text, text, text) from public, anon;
grant execute on function public.save_my_contact(text, text, text) to authenticated;

create or replace function private.contact_complete(p_user uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.organizer_contacts c where c.user_id = p_user
    and c.full_name is not null and c.email is not null and c.phone is not null);
$$;
revoke all on function private.contact_complete(uuid) from public, anon, authenticated;

create or replace function private.require_contact() returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.contact_complete(auth.uid()) then
    raise exception 'Completa nome e cognome, email e telefono per creare o attivare un torneo: servono solo per contattarti in caso di assistenza'
      using errcode = 'P0001', hint = 'contact_required';
  end if;
end;
$$;
revoke all on function private.require_contact() from public, anon, authenticated;

-- Tournament creation requires the contact (same function as 202611090001, plus the check).
create or replace function public.create_tenant(
  p_name text, p_slug text, p_months integer, p_features text[] default '{}',
  p_kind text default 'season', p_event_date date default null
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_tenant uuid;
  v_creator uuid := auth.uid();
  v_quote jsonb;
  v_months integer := p_months;
begin
  if v_creator is null then raise exception 'Accesso richiesto'; end if;
  perform private.require_contact();
  if p_kind not in ('season', 'event') then raise exception 'Formato non valido'; end if;
  if p_slug !~ '^[a-z0-9][a-z0-9-]{2,41}$'
     or p_slug in ('admin','api','auth','static','console','login','signup','support','help','italfut','www')
  then raise exception 'Indirizzo non valido o riservato'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 3 and 90 then raise exception 'Nome torneo non valido'; end if;
  if p_kind = 'season' then
    if (select count(*) from public.tenants where owner_id = v_creator and kind = 'season') >= 10 then
      raise exception 'Limite di piattaforme raggiunto'; end if;
    v_quote := public.quote_plan(p_months, p_features);
  else
    if p_event_date is null or p_event_date < private.rome_today() or p_event_date > private.rome_today() + 730 then
      raise exception 'Scegli la data del torneo: da oggi a due anni da oggi'; end if;
    if (select count(*) from public.tenants where owner_id = v_creator and created_at > now() - interval '1 hour') >= 20 then
      raise exception 'Troppi tornei creati in poco tempo: riprova tra un’ora'; end if;
    v_months := 1;
    v_quote := public.quote_event(p_features);
  end if;
  insert into public.tenants(owner_id, slug, name, kind, event_date)
    values (v_creator, p_slug, trim(p_name), p_kind, case when p_kind = 'event' then p_event_date end)
    returning id into v_tenant;
  insert into public.tenant_members(tenant_id, user_id, role) values (v_tenant, v_creator, 'owner');
  insert into public.tenant_features(tenant_id, code, enabled, source)
    select v_tenant, code, true, 'included' from public.feature_catalog where is_core;
  insert into public.plan_quotes(tenant_id, months, selected_features, total_cents)
    values (v_tenant, v_months, coalesce(p_features, '{}'), (v_quote->>'total_cents')::integer);
  return v_tenant;
end;
$$;
revoke all on function public.create_tenant(text, text, integer, text[], text, date) from public, anon;
grant execute on function public.create_tenant(text, text, integer, text[], text, date) to authenticated;

-- Paying a plan or extras also requires the contact of the person paying (tournaments
-- created before this migration included). Same function as 202611090001, plus the check.
create or replace function public.start_checkout(p_tenant_id uuid, p_months integer, p_features text[] default '{}')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_tenant public.tenants%rowtype;
  v_features text[];
  v_quote jsonb;
  v_amount integer;
  v_id uuid;
  v_names text;
  v_months integer := p_months;
begin
  if v_user is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  perform private.require_contact();
  select * into v_tenant from public.tenants where id = p_tenant_id;
  if v_tenant.id is null or not exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant_id and m.user_id = v_user and m.role in ('owner', 'admin')
  ) then raise exception 'Solo il proprietario o un amministratore del torneo può acquistare' using errcode = '42501'; end if;
  if v_tenant.status not in ('draft', 'active') then raise exception 'Torneo sospeso: contatta l’assistenza'; end if;
  if private.event_locked(p_tenant_id) then raise exception 'Il torneo è concluso: non si possono più aggiungere moduli'; end if;
  select coalesce(array_agg(distinct f order by f), '{}') into v_features
    from unnest(coalesce(p_features, '{}')) f;
  if cardinality(v_features) > 20 then raise exception 'Troppi moduli'; end if;
  if exists (
    select 1 from unnest(v_features) f(code)
    left join public.feature_catalog c on c.code = f.code
    where c.code is null or c.is_core
  ) then raise exception 'Uno o più moduli non sono acquistabili'; end if;
  if (select count(*) from public.payments p
      where p.tenant_id = p_tenant_id and p.status = 'pending' and p.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Troppi tentativi di pagamento: riprova tra un’ora';
  end if;
  if v_tenant.kind = 'event' then
    -- Free platform: only modules not already active are paid, once.
    select coalesce(array_agg(f order by f), '{}') into v_features from unnest(v_features) f
      where not exists (select 1 from public.tenant_features tf where tf.tenant_id = p_tenant_id and tf.code = f and tf.enabled
                        and (tf.ends_at is null or tf.ends_at > now()));
    if cardinality(v_features) = 0 then raise exception 'Seleziona almeno un modulo da attivare'; end if;
    v_months := 1;
    v_quote := public.quote_event(v_features);
  else
    v_quote := public.quote_plan(p_months, v_features);
  end if;
  v_amount := (v_quote->>'total_cents')::integer;
  if v_amount <= 0 then raise exception 'Importo non valido'; end if;
  insert into public.payments(tenant_id, created_by, months, features, amount_cents)
    values (p_tenant_id, v_user, v_months, v_features, v_amount) returning id into v_id;
  select string_agg(c.name, ', ' order by c.name) into v_names
    from public.feature_catalog c where c.code = any(v_features);
  return jsonb_build_object(
    'payment_id', v_id, 'tenant_id', v_tenant.id, 'slug', v_tenant.slug, 'tenant_name', v_tenant.name,
    'months', v_months, 'features', to_jsonb(v_features), 'amount_cents', v_amount,
    'description', case when v_tenant.kind = 'event'
      then 'Moduli extra per il torneo di un giorno: ' || coalesce(v_names, '')
      else 'Piattaforma ItalFUT' || coalesce(' + ' || v_names, '') || ' · '
        || v_months || case when v_months = 1 then ' mese' else ' mesi' end end);
end;
$$;
revoke all on function public.start_checkout(uuid, integer, text[]) from public, anon;
grant execute on function public.start_checkout(uuid, integer, text[]) to authenticated;

-- Superadmin dashboard: "Recapiti organizzatori" tab.
create or replace function private.admin_table(p_table text) returns regclass
language plpgsql stable set search_path = ''
as $$
begin
  if p_table is null or p_table not in (
    'profiles','tenants','tenant_members','feature_catalog','tenant_features','plan_quotes',
    'upgrade_requests','subscriptions','competitions','teams','competition_teams','players',
    'matches','match_events','staff_members','awards','sponsors','articles','market_slots',
    'galleries','support_requests','platform_admins','admin_audit_log','payments','organizer_contacts'
  ) then
    raise exception 'Tabella non gestibile: %', coalesce(p_table, 'null') using errcode = '42P01';
  end if;
  return ('public.' || quote_ident(p_table))::regclass;
end;
$$;
revoke all on function private.admin_table(text) from public, anon, authenticated;

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
    'galleries','support_requests','platform_admins','admin_audit_log','payments','organizer_contacts']
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

commit;
