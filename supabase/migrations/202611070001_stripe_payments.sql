-- Stripe payments (hosted Checkout, one payment per period: 1/3/6/12 months, no automatic
-- renewal). Prices are always computed here (quote_plan), never taken from the browser.
-- Edge Functions: create-checkout-session (as the user) and stripe-webhook (service role).
-- Re-runnable.
begin;

-- 1) Ledger of checkout attempts and payments.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  months integer not null check (months in (1, 3, 6, 12)),
  features text[] not null default '{}',
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'eur',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired', 'refunded')),
  stripe_session_id text unique,
  stripe_payment_intent text,
  stripe_customer_id text,
  amount_paid_cents integer,
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists payments_tenant_idx on public.payments(tenant_id, created_at desc);
create index if not exists payments_intent_idx on public.payments(stripe_payment_intent);
alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;
drop policy if exists "Own payments" on public.payments;
create policy "Own payments" on public.payments for select to authenticated using (private.is_member(tenant_id));

-- 2) Publication follows the paid period. Tournaments that never paid (published by hand
--    by the superadmin) keep working as before; once a tournament has paid, its public
--    site needs a plan that has not expired. Staff always see their own tournament.
create or replace function private.plan_active(p_tenant uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (select 1 from public.payments p where p.tenant_id = p_tenant and p.status in ('paid', 'refunded'))
      or exists (select 1 from public.subscriptions s where s.tenant_id = p_tenant and s.status = 'active' and s.period_end > now());
$$;
revoke all on function private.plan_active(uuid) from public;
grant execute on function private.plan_active(uuid) to anon, authenticated;

create or replace function private.can_read(p_tenant uuid, p_code text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.feature_on(p_tenant, p_code) and exists (
    select 1 from public.tenants t where t.id = p_tenant
    and ((t.status = 'active' and (private.plan_active(t.id) or private.is_member(t.id)))
      or (t.status = 'draft' and private.is_member(t.id)))
  );
$$;

drop policy if exists "Read active or own tenants" on public.tenants;
create policy "Read active or own tenants" on public.tenants for select to anon, authenticated
  using ((status = 'active' and (private.plan_active(id) or private.is_member(id)))
      or (status = 'draft' and private.is_member(id)));

-- 3) Called by create-checkout-session with the user's token: checks the role, prices the
--    plan and records a pending payment. Only owners and administrators can buy.
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
begin
  if v_user is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  select * into v_tenant from public.tenants where id = p_tenant_id;
  if v_tenant.id is null or not exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant_id and m.user_id = v_user and m.role in ('owner', 'admin')
  ) then raise exception 'Solo il proprietario o un amministratore del torneo può acquistare' using errcode = '42501'; end if;
  if v_tenant.status not in ('draft', 'active') then raise exception 'Torneo sospeso: contatta l’assistenza'; end if;
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
  v_quote := public.quote_plan(p_months, v_features);
  v_amount := (v_quote->>'total_cents')::integer;
  insert into public.payments(tenant_id, created_by, months, features, amount_cents)
    values (p_tenant_id, v_user, p_months, v_features, v_amount) returning id into v_id;
  select string_agg(c.name, ', ' order by c.name) into v_names
    from public.feature_catalog c where c.code = any(v_features);
  return jsonb_build_object(
    'payment_id', v_id, 'tenant_id', v_tenant.id, 'slug', v_tenant.slug, 'tenant_name', v_tenant.name,
    'months', p_months, 'features', to_jsonb(v_features), 'amount_cents', v_amount,
    'description', 'Piattaforma ItalFUT' || coalesce(' + ' || v_names, '') || ' · '
      || p_months || case when p_months = 1 then ' mese' else ' mesi' end);
end;
$$;
revoke all on function public.start_checkout(uuid, integer, text[]) from public, anon;
grant execute on function public.start_checkout(uuid, integer, text[]) to authenticated;

-- 4) Called only by stripe-webhook (service role) after verifying Stripe's signature.
--    Idempotent: the same event can arrive more than once.
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
begin
  select * into v_pay from public.payments where stripe_session_id = p_session_id for update;
  if v_pay.id is null then return 'unknown_session'; end if;
  if v_pay.status = 'paid' then return 'already_fulfilled'; end if;
  -- The price before promotion codes must be exactly the one computed in start_checkout.
  if p_amount_subtotal is distinct from v_pay.amount_cents or lower(coalesce(p_currency, '')) <> v_pay.currency then
    update public.payments set status = 'failed', stripe_payment_intent = p_payment_intent where id = v_pay.id;
    return 'amount_mismatch';
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
  -- Purchased modules: extended from their current end when still active.
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
  -- A paid plan publishes the tournament.
  update public.tenants set status = 'active' where id = v_pay.tenant_id and status = 'draft';
  return 'fulfilled';
end;
$$;
revoke all on function public.fulfill_payment(text, text, text, integer, integer, text) from public, anon, authenticated;
grant execute on function public.fulfill_payment(text, text, text, integer, integer, text) to service_role;

-- Expired or failed checkouts, refunds (modules are not revoked automatically: see the guide).
create or replace function public.mark_payment(p_session_id text, p_payment_intent text, p_status text)
returns text language plpgsql security definer set search_path = ''
as $$
begin
  if p_status not in ('expired', 'failed', 'refunded') then raise exception 'Stato non valido'; end if;
  if p_status = 'refunded' then
    update public.payments set status = 'refunded' where stripe_payment_intent = p_payment_intent and status = 'paid';
  else
    update public.payments set status = p_status, stripe_payment_intent = coalesce(p_payment_intent, stripe_payment_intent)
      where stripe_session_id = p_session_id and status = 'pending';
  end if;
  return case when found then 'updated' else 'unchanged' end;
end;
$$;
revoke all on function public.mark_payment(text, text, text) from public, anon, authenticated;
grant execute on function public.mark_payment(text, text, text) to service_role;
grant select, update on public.payments to service_role;

-- 5) Superadmin dashboard: payments tab.
create or replace function private.admin_table(p_table text) returns regclass
language plpgsql stable set search_path = ''
as $$
begin
  if p_table is null or p_table not in (
    'profiles','tenants','tenant_members','feature_catalog','tenant_features','plan_quotes',
    'upgrade_requests','subscriptions','competitions','teams','competition_teams','players',
    'matches','match_events','staff_members','awards','sponsors','articles','market_slots',
    'galleries','support_requests','platform_admins','admin_audit_log','payments'
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
    'galleries','support_requests','platform_admins','admin_audit_log','payments']
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
