-- Custom plan duration (any whole number of months from 1 to 24, not only 1/3/6/12) and
-- new Foto gallery price (1 €/month). The discount is the one of the highest standard
-- tier reached: 3+ months −8%, 6+ months −15%, 12+ months −25%.
-- Safe to run more than once.
begin;

-- quote_plan runs with the caller's rights (anon included): the rules are inlined, no private helpers.

-- Tables: allow 1..24 months.
alter table public.plan_quotes drop constraint if exists plan_quotes_months_check;
alter table public.plan_quotes add constraint plan_quotes_months_check check (months between 1 and 24);
alter table public.upgrade_requests drop constraint if exists upgrade_requests_months_check;
alter table public.upgrade_requests add constraint upgrade_requests_months_check check (months between 1 and 24);
alter table public.payments drop constraint if exists payments_months_check;
alter table public.payments add constraint payments_months_check check (months between 1 and 24);

-- Price list.
update public.feature_catalog set monthly_cents = 100 where code = 'gallery';

-- Price tables remain authoritative in SQL; frontend arithmetic is only a preview.
create or replace function public.quote_plan(p_months integer, p_features text[] default '{}')
returns jsonb language plpgsql stable set search_path = ''
as $$
declare full_monthly integer := 1900;
declare multiplier numeric;
declare invalid_count integer;
declare extras integer;
begin
  if p_months is null or p_months not between 1 and 24 then raise exception 'Durata non supportata: scegli da 1 a 24 mesi'; end if;
  if cardinality(p_features) > 20 then raise exception 'Troppi moduli'; end if;
  select count(*) into invalid_count
    from unnest(p_features) f(code)
    left join public.feature_catalog c on c.code=f.code
    where c.code is null;
  if invalid_count > 0 then raise exception 'Modulo non riconosciuto'; end if;
  select coalesce(sum(monthly_cents),0)::integer into extras
    from public.feature_catalog where code = any(p_features) and not is_core;
  full_monthly := full_monthly + extras;
  multiplier := case when p_months >= 12 then .75 when p_months >= 6 then .85 when p_months >= 3 then .92 else 1 end;
  return jsonb_build_object(
    'months', p_months,
    'monthly_cents', full_monthly,
    'total_cents', round(full_monthly * p_months * multiplier)::integer,
    'discount_percent', round((1-multiplier)*100)::integer
  );
end;
$$;
grant execute on function public.quote_plan(integer,text[]) to anon, authenticated;

create or replace function public.request_upgrade(p_tenant_id uuid,p_months integer,p_features text[])
returns uuid language plpgsql security definer set search_path = ''
as $$
declare result uuid;
declare amount integer;
declare multiplier numeric;
declare requested integer;
begin
  if not private.can_manage(p_tenant_id) then raise exception 'Non autorizzato'; end if;
  if p_months is null or p_months not between 1 and 24 then raise exception 'Durata non supportata: scegli da 1 a 24 mesi'; end if;
  if p_features is null or cardinality(p_features) = 0 or cardinality(p_features) > 20 then raise exception 'Seleziona i moduli'; end if;
  if exists (
    select 1 from unnest(p_features) p(code)
    left join public.feature_catalog f on f.code=p.code
    where f.code is null or f.is_core
  ) then raise exception 'Uno o più moduli non sono acquistabili'; end if;
  if exists (
    select 1 from public.tenant_features f
    where f.tenant_id=p_tenant_id and f.code = any(p_features) and f.enabled
    and (f.ends_at is null or f.ends_at > now())
  ) then raise exception 'Un modulo richiesto è già attivo'; end if;
  select coalesce(sum(f.monthly_cents),0)::integer into requested
    from public.feature_catalog f where f.code = any(p_features);
  multiplier := case when p_months >= 12 then .75 when p_months >= 6 then .85 when p_months >= 3 then .92 else 1 end;
  amount := round(requested * p_months * multiplier)::integer;
  if amount <= 0 then raise exception 'Importo non valido'; end if;
  insert into public.upgrade_requests(tenant_id,requested_by,requested_features,months,total_cents)
  values(p_tenant_id,auth.uid(),p_features,p_months,amount) returning id into result;
  -- Paid entitlements are NOT changed here. A server-side verified payment
  -- or manual admin operation must write tenant_features in a transaction.
  return result;
end;
$$;
revoke all on function public.request_upgrade(uuid,integer,text[]) from public, anon;
grant execute on function public.request_upgrade(uuid,integer,text[]) to authenticated;

commit;
