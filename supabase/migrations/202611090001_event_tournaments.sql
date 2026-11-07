-- One-day tournaments ("eventi", e.g. 12-hour tournaments): free core platform.
--
-- * tenants.kind = 'event' with a single event_date. Organizers build the tournament in
--   draft whenever they want and publish it themselves from the event day on (publish_event).
-- * After publishing they have 48 hours to update results and data; then the console is
--   closed (no writes at all) and the public site stays online for good, until the owner
--   or a superadmin deletes the tournament.
-- * Matches of an event must be played on its date (Europe/Rome).
-- * Extra modules cost their 1-month price, paid once, and stay on for the life of the
--   event's site. No subscription, no automatic renewal.
-- * Any number of events per account (season tournaments keep their limit of 10).
-- Run after 202611080001_custom_duration.sql. Safe to run more than once.
begin;

-- 1) Columns ---------------------------------------------------------------------------
alter table public.tenants add column if not exists kind text not null default 'season';
alter table public.tenants add column if not exists event_date date;
alter table public.tenants add column if not exists published_at timestamptz;
alter table public.tenants drop constraint if exists tenants_kind_check;
alter table public.tenants add constraint tenants_kind_check check (kind in ('season', 'event'));
alter table public.tenants drop constraint if exists tenants_event_date_check;
alter table public.tenants add constraint tenants_event_date_check check (kind <> 'event' or event_date is not null);
-- Visitors see the format and the date; the publication time is only for members (RLS on rows).
grant select (kind, event_date, published_at) on public.tenants to anon;

-- 2) Helpers ---------------------------------------------------------------------------
create or replace function private.rome_today() returns date
language sql stable set search_path = ''
as $$ select (now() at time zone 'Europe/Rome')::date $$;

-- True once the 48-hour editing window of a published event is over.
create or replace function private.event_locked(p_tenant uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tenants t
    where t.id = p_tenant and t.kind = 'event'
      and t.published_at is not null and now() > t.published_at + interval '48 hours'
  );
$$;
revoke all on function private.event_locked(uuid), private.rome_today() from public;
grant execute on function private.event_locked(uuid), private.rome_today() to anon, authenticated;

-- Events never need a paid period to be visible.
create or replace function private.plan_active(p_tenant uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.tenants t where t.id = p_tenant and t.kind = 'event')
      or not exists (select 1 from public.payments p where p.tenant_id = p_tenant and p.status in ('paid', 'refunded'))
      or exists (select 1 from public.subscriptions s where s.tenant_id = p_tenant and s.status = 'active' and s.period_end > now());
$$;

-- No writes on a closed event (all domain tables go through can_write).
create or replace function private.can_write(p_tenant uuid, p_code text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.feature_on(p_tenant, p_code) and private.can_manage(p_tenant)
    and exists (select 1 from public.tenants t where t.id = p_tenant and t.status in ('draft', 'active'))
    and not private.event_locked(p_tenant);
$$;

drop policy if exists "Edit own tenant branding" on public.tenants;
create policy "Edit own tenant branding" on public.tenants for update to authenticated
  using (private.can_manage(id) and status in ('draft', 'active') and not private.event_locked(id))
  with check (private.can_manage(id) and status in ('draft', 'active') and not private.event_locked(id));

-- Image uploads follow the same rule (deleting a whole tournament still cleans its files).
create or replace function private.can_manage_media(p_name text) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_parts text[] := string_to_array(coalesce(p_name, ''), '/');
  v_tenant uuid;
begin
  if array_length(v_parts, 1) is distinct from 3
     or v_parts[1] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or v_parts[2] !~ '^[a-z_]{1,40}$'
     or v_parts[3] !~ '^[0-9a-f-]{36}\.webp$' then
    return false;
  end if;
  v_tenant := v_parts[1]::uuid;
  if not exists (select 1 from public.tenants t where t.id = v_tenant and t.status in ('draft', 'active')) then
    return private.is_platform_admin() or exists (
      select 1 from private.deleted_tenants d
      where d.tenant_id = v_tenant and d.owner_id = (select auth.uid()) and d.deleted_at > now() - interval '7 days'
    );
  end if;
  if private.event_locked(v_tenant) then return private.is_platform_admin(); end if;
  return private.can_manage(v_tenant) or private.is_platform_admin();
end;
$$;

-- 3) Matches of an event happen on its date ---------------------------------------------
create or replace function private.check_event_match() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_date date;
begin
  select event_date into v_date from public.tenants where id = new.tenant_id and kind = 'event';
  if v_date is not null and (new.kickoff_at at time zone 'Europe/Rome')::date <> v_date then
    raise exception 'Le partite di un torneo di un giorno si giocano il %: scegli un orario in quella data', to_char(v_date, 'DD/MM/YYYY');
  end if;
  return new;
end;
$$;
drop trigger if exists ital_event_match_date on public.matches;
create trigger ital_event_match_date before insert or update of kickoff_at on public.matches
  for each row execute function private.check_event_match();

-- 4) Prices: an event pays only the extras, 1-month price each, once ----------------------
create or replace function public.quote_event(p_features text[] default '{}')
returns jsonb language plpgsql stable set search_path = ''
as $$
declare v_total integer;
begin
  if cardinality(coalesce(p_features, '{}')) > 20 then raise exception 'Troppi moduli'; end if;
  if exists (
    select 1 from unnest(coalesce(p_features, '{}')) f(code)
    left join public.feature_catalog c on c.code = f.code
    where c.code is null or c.is_core
  ) then raise exception 'Uno o più moduli non sono acquistabili'; end if;
  select coalesce(sum(monthly_cents), 0)::integer into v_total
    from public.feature_catalog where code = any(coalesce(p_features, '{}')) and not is_core;
  return jsonb_build_object('months', 1, 'monthly_cents', v_total, 'total_cents', v_total, 'discount_percent', 0);
end;
$$;
grant execute on function public.quote_event(text[]) to anon, authenticated;

-- 5) Creation: format and date ----------------------------------------------------------
drop function if exists public.create_tenant(text, text, integer, text[]);
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
    -- Anti-spam only: events are unlimited, but not hundreds in a few minutes.
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

-- 6) Event date and publication ----------------------------------------------------------
-- The date can change until the event is published; matches move with it (same time).
create or replace function public.set_event_date(p_tenant_id uuid, p_date date)
returns date language plpgsql security definer set search_path = ''
as $$
declare v_tenant public.tenants%rowtype;
begin
  if not exists (select 1 from public.tenant_members m where m.tenant_id = p_tenant_id and m.user_id = auth.uid() and m.role in ('owner', 'admin'))
    then raise exception 'Solo il proprietario o un amministratore può cambiare la data' using errcode = '42501'; end if;
  select * into v_tenant from public.tenants where id = p_tenant_id for update;
  if v_tenant.kind <> 'event' then raise exception 'Questo torneo non è un evento di un giorno'; end if;
  if v_tenant.published_at is not null then raise exception 'Il torneo è già pubblicato: la data non si può più cambiare'; end if;
  if p_date is null or p_date < private.rome_today() or p_date > private.rome_today() + 730 then
    raise exception 'Scegli una data da oggi a due anni da oggi'; end if;
  update public.tenants set event_date = p_date where id = p_tenant_id;
  update public.matches set kickoff_at = ((p_date + (kickoff_at at time zone 'Europe/Rome')::time) at time zone 'Europe/Rome')
    where tenant_id = p_tenant_id;
  return p_date;
end;
$$;
revoke all on function public.set_event_date(uuid, date) from public, anon;
grant execute on function public.set_event_date(uuid, date) to authenticated;

-- Publishing is free and possible from the event day on; it opens the 48-hour window.
create or replace function public.publish_event(p_tenant_id uuid)
returns timestamptz language plpgsql security definer set search_path = ''
as $$
declare v_tenant public.tenants%rowtype;
begin
  if not exists (select 1 from public.tenant_members m where m.tenant_id = p_tenant_id and m.user_id = auth.uid() and m.role in ('owner', 'admin'))
    then raise exception 'Solo il proprietario o un amministratore può pubblicare' using errcode = '42501'; end if;
  select * into v_tenant from public.tenants where id = p_tenant_id for update;
  if v_tenant.kind <> 'event' then raise exception 'Questo torneo non è un evento di un giorno'; end if;
  if v_tenant.published_at is not null then return v_tenant.published_at; end if;
  if v_tenant.status <> 'draft' then raise exception 'Torneo non pubblicabile: contatta l’assistenza'; end if;
  if private.rome_today() < v_tenant.event_date then
    raise exception 'Potrai pubblicare il torneo dal giorno dell’evento (%)', to_char(v_tenant.event_date, 'DD/MM/YYYY'); end if;
  update public.tenants set status = 'active', published_at = now() where id = p_tenant_id;
  return now();
end;
$$;
revoke all on function public.publish_event(uuid) from public, anon;
grant execute on function public.publish_event(uuid) to authenticated;

-- 7) Plan, checkout and fulfillment aware of the format -----------------------------------
create or replace function public.save_plan(p_tenant_id uuid, p_months integer, p_features text[] default '{}')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_features text[];
  v_quote jsonb;
  v_id uuid;
  v_event boolean;
  v_months integer := p_months;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant_id and m.user_id = auth.uid() and m.role in ('owner', 'admin')
  ) then raise exception 'Solo il proprietario o un amministratore può modificare il piano' using errcode = '42501'; end if;
  if private.event_locked(p_tenant_id) then raise exception 'Il torneo è concluso: la configurazione non si può più modificare'; end if;
  select kind = 'event' into v_event from public.tenants where id = p_tenant_id;
  select coalesce(array_agg(distinct f order by f), '{}') into v_features
    from unnest(coalesce(p_features, '{}')) f;
  if exists (
    select 1 from unnest(v_features) f(code)
    left join public.feature_catalog c on c.code = f.code
    where c.code is null or c.is_core
  ) then raise exception 'Uno o più moduli non sono acquistabili'; end if;
  if v_event then v_months := 1; v_quote := public.quote_event(v_features);
  else v_quote := public.quote_plan(p_months, v_features); end if;
  select id into v_id from public.plan_quotes
    where tenant_id = p_tenant_id and status = 'pending' order by created_at desc limit 1 for update;
  if v_id is null then
    insert into public.plan_quotes(tenant_id, months, selected_features, total_cents)
      values (p_tenant_id, v_months, v_features, (v_quote->>'total_cents')::integer);
  else
    update public.plan_quotes set months = v_months, selected_features = v_features,
      total_cents = (v_quote->>'total_cents')::integer where id = v_id;
  end if;
  return v_quote;
end;
$$;
revoke all on function public.save_plan(uuid, integer, text[]) from public, anon;
grant execute on function public.save_plan(uuid, integer, text[]) to authenticated;

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

create or replace function public.fulfill_payment(
  p_session_id text, p_payment_intent text, p_customer text,
  p_amount_subtotal integer, p_amount_total integer, p_currency text
) returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_pay public.payments%rowtype;
  v_sub public.subscriptions%rowtype;
  v_start timestamptz;
  v_end timestamptz;
  v_span interval;
  v_kind text;
begin
  select * into v_pay from public.payments where stripe_session_id = p_session_id for update;
  if v_pay.id is null then return 'unknown_session'; end if;
  if v_pay.status = 'paid' then return 'already_fulfilled'; end if;
  if p_amount_subtotal is distinct from v_pay.amount_cents or lower(coalesce(p_currency, '')) <> v_pay.currency then
    update public.payments set status = 'failed', stripe_payment_intent = p_payment_intent where id = v_pay.id;
    return 'amount_mismatch';
  end if;
  select kind into v_kind from public.tenants where id = v_pay.tenant_id;

  if v_kind = 'event' then
    -- One-day tournament: extras stay on for the life of the event's site.
    update public.payments set status = 'paid', paid_at = now(), period_start = now(), period_end = null,
      stripe_payment_intent = p_payment_intent, stripe_customer_id = p_customer, amount_paid_cents = p_amount_total
      where id = v_pay.id;
    insert into public.tenant_features(tenant_id, code, enabled, source, starts_at, ends_at)
      select v_pay.tenant_id, f.code, true, 'stripe', now(), null from unnest(v_pay.features) f(code)
    on conflict (tenant_id, code) do update set enabled = true, ends_at = null,
      source = case when public.tenant_features.source = 'included' then 'included' else 'stripe' end,
      starts_at = least(public.tenant_features.starts_at, now());
    update public.upgrade_requests set status = 'approved'
      where tenant_id = v_pay.tenant_id and status = 'pending' and requested_features <@ v_pay.features;
    return 'fulfilled';
  end if;

  v_span := make_interval(months => v_pay.months);
  select * into v_sub from public.subscriptions s where s.tenant_id = v_pay.tenant_id
    order by s.period_end desc nulls last limit 1 for update;
  v_start := greatest(now(), coalesce(case when v_sub.status = 'active' then v_sub.period_end end, now()));
  v_end := v_start + v_span;
  update public.payments set status = 'paid', paid_at = now(), period_start = v_start, period_end = v_end,
    stripe_payment_intent = p_payment_intent, stripe_customer_id = p_customer, amount_paid_cents = p_amount_total
    where id = v_pay.id;
  if v_sub.id is null then
    insert into public.subscriptions(tenant_id, stripe_customer_id, status, period_start, period_end)
      values (v_pay.tenant_id, p_customer, 'active', v_start, v_end);
  else
    update public.subscriptions set status = 'active', period_end = v_end,
      period_start = case when v_sub.status = 'active' and v_sub.period_end > now() then v_sub.period_start else v_start end,
      stripe_customer_id = coalesce(p_customer, v_sub.stripe_customer_id)
      where id = v_sub.id;
  end if;
  insert into public.tenant_features(tenant_id, code, enabled, source, starts_at, ends_at)
    select v_pay.tenant_id, f.code, true, 'stripe', now(), now() + v_span from unnest(v_pay.features) f(code)
  on conflict (tenant_id, code) do update set
    enabled = true,
    source = case when public.tenant_features.enabled and public.tenant_features.ends_at is null then public.tenant_features.source else 'stripe' end,
    starts_at = least(public.tenant_features.starts_at, now()),
    ends_at = case
      when public.tenant_features.enabled and public.tenant_features.ends_at is null then null
      else greatest(now(), case when public.tenant_features.enabled then public.tenant_features.ends_at end) + v_span
    end;
  update public.upgrade_requests set status = 'approved'
    where tenant_id = v_pay.tenant_id and status = 'pending' and requested_features <@ v_pay.features;
  update public.tenants set status = 'active' where id = v_pay.tenant_id and status = 'draft';
  return 'fulfilled';
end;
$$;
revoke all on function public.fulfill_payment(text, text, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.fulfill_payment(text, text, text, integer, integer, text) to service_role;

-- Requests (payments switched off): an event asks for 1-month prices, no base fee.
create or replace function public.request_upgrade(p_tenant_id uuid, p_months integer, p_features text[])
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  result uuid;
  amount integer;
  multiplier numeric;
  requested integer;
  v_event boolean;
  v_months integer := p_months;
begin
  if not private.can_manage(p_tenant_id) then raise exception 'Non autorizzato'; end if;
  if private.event_locked(p_tenant_id) then raise exception 'Il torneo è concluso: non si possono più aggiungere moduli'; end if;
  select kind = 'event' into v_event from public.tenants where id = p_tenant_id;
  if v_event then v_months := 1; end if;
  if v_months is null or v_months not between 1 and 24 then raise exception 'Durata non supportata: scegli da 1 a 24 mesi'; end if;
  if p_features is null or cardinality(p_features) = 0 or cardinality(p_features) > 20 then raise exception 'Seleziona i moduli'; end if;
  if exists (
    select 1 from unnest(p_features) p(code)
    left join public.feature_catalog f on f.code = p.code
    where f.code is null or f.is_core
  ) then raise exception 'Uno o più moduli non sono acquistabili'; end if;
  if exists (
    select 1 from public.tenant_features f
    where f.tenant_id = p_tenant_id and f.code = any(p_features) and f.enabled
    and (f.ends_at is null or f.ends_at > now())
  ) then raise exception 'Un modulo richiesto è già attivo'; end if;
  select coalesce(sum(f.monthly_cents), 0)::integer into requested
    from public.feature_catalog f where f.code = any(p_features);
  multiplier := case when v_event then 1 when v_months >= 12 then .75 when v_months >= 6 then .85 when v_months >= 3 then .92 else 1 end;
  amount := round(requested * v_months * multiplier)::integer;
  if amount <= 0 then raise exception 'Importo non valido'; end if;
  insert into public.upgrade_requests(tenant_id, requested_by, requested_features, months, total_cents)
  values (p_tenant_id, auth.uid(), p_features, v_months, amount) returning id into result;
  return result;
end;
$$;
revoke all on function public.request_upgrade(uuid, integer, text[]) from public, anon;
grant execute on function public.request_upgrade(uuid, integer, text[]) to authenticated;

commit;
