-- ItalFUT | 001_initial.sql
-- Execute in a NEW Supabase project using the SQL editor or Supabase CLI.
-- Multitenant, tenant-scoped composite references, feature grants and fail-closed RLS.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  full_name text,
  email text not null,
  created_at timestamptz not null default now()
);
create unique index profiles_email_idx on public.profiles (lower(email));

create function private.sync_profile() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare chosen_username text;
begin
  chosen_username := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  if chosen_username !~ '^[a-z0-9_]{3,30}$' then
    chosen_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;
  insert into public.profiles (id, username, email, full_name)
  values (new.id, chosen_username, lower(new.email), nullif(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
create trigger ital_profile_created after insert on auth.users
for each row execute function private.sync_profile();
create trigger ital_profile_email_updated after update of email on auth.users
for each row execute function private.sync_profile();

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,41}$'),
  name text not null check (char_length(trim(name)) between 3 and 90),
  tagline text,
  logo_url text,
  cover_url text,
  brand_color text not null default '#153e35' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  status text not null default 'draft' check (status in ('draft', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);
create index tenants_owner_idx on public.tenants (owner_id);

create table public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index tenant_members_user_idx on public.tenant_members(user_id, tenant_id);

create table public.feature_catalog (
  code text primary key,
  name text not null,
  monthly_cents integer not null check (monthly_cents >= 0),
  is_core boolean not null default false,
  created_at timestamptz not null default now()
);
insert into public.feature_catalog (code, name, monthly_cents, is_core) values
 ('competitions','Competizioni',0,true),
 ('teams','Squadre',0,true),
 ('players','Giocatori',0,true),
 ('matches','Partite e risultati',0,true),
 ('standings','Classifiche',0,true),
 ('statistics','Statistiche avanzate',600,false),
 ('staff','Staff e presidenti',300,false),
 ('awards','Premi del mese',500,false),
 ('sponsors','Sponsor e partner',500,false),
 ('articles','News e contenuti',400,false),
 ('market','Calciomercato',500,false),
 ('gallery','Foto gallery',300,false);

create table public.tenant_features (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null references public.feature_catalog(code),
  enabled boolean not null default false,
  source text not null default 'manual' check (source in ('included', 'manual', 'stripe')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (tenant_id, code),
  check (ends_at is null or ends_at > starts_at)
);
create index tenant_features_enabled_idx on public.tenant_features(tenant_id, code) where enabled;

create table public.plan_quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  months integer not null check (months in (1,3,6,12)),
  selected_features text[] not null default '{}',
  total_cents integer not null check (total_cents >= 0),
  status text not null default 'pending' check (status in ('pending','accepted','cancelled')),
  created_at timestamptz not null default now()
);
create index plan_quotes_tenant_idx on public.plan_quotes(tenant_id, created_at desc);

create table public.upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  requested_features text[] not null,
  months integer not null check (months in (1,3,6,12)),
  total_cents integer not null check (total_cents > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  created_at timestamptz not null default now()
);
create index upgrade_requests_tenant_idx on public.upgrade_requests(tenant_id, created_at desc);

-- Payment lifecycle is intentionally read-only to clients. Future Stripe webhooks
-- may write these rows only after verifying the Stripe signature server-side.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'pending' check (status in ('pending','trialing','active','past_due','cancelled','expired')),
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now()
);
create index subscriptions_tenant_idx on public.subscriptions(tenant_id);

-- Row-level predicates are private SECURITY DEFINER functions with a pinned
-- search_path. None rely on user-editable JWT metadata.
create function private.is_member(p_tenant uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant and m.user_id = (select auth.uid())
  );
$$;
create function private.can_manage(p_tenant uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant and m.user_id = (select auth.uid())
    and m.role in ('owner','admin','editor')
  );
$$;
create function private.feature_on(p_tenant uuid, p_code text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_features f
    where f.tenant_id = p_tenant and f.code = p_code and f.enabled
    and (f.ends_at is null or f.ends_at > now())
    and f.starts_at <= now()
  );
$$;
create function private.can_read(p_tenant uuid, p_code text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.feature_on(p_tenant,p_code) and exists (
    select 1 from public.tenants t where t.id = p_tenant
    and (t.status = 'active' or (t.status = 'draft' and private.is_member(t.id)))
  );
$$;
create function private.can_write(p_tenant uuid, p_code text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.feature_on(p_tenant,p_code) and private.can_manage(p_tenant)
  and exists(select 1 from public.tenants t where t.id=p_tenant and t.status in ('draft','active'));
$$;
revoke all on function private.is_member(uuid),private.can_manage(uuid),private.feature_on(uuid,text),
  private.can_read(uuid,text),private.can_write(uuid,text) from public;
grant execute on function private.is_member(uuid),private.can_manage(uuid),private.feature_on(uuid,text),
  private.can_read(uuid,text),private.can_write(uuid,text) to anon,authenticated;

-- Price tables remain authoritative in SQL; frontend arithmetic is only a preview.
create function public.quote_plan(p_months integer, p_features text[] default '{}')
returns jsonb language plpgsql stable set search_path = ''
as $$
declare full_monthly integer := 1900;
declare multiplier numeric;
declare invalid_count integer;
declare extras integer;
begin
  if p_months not in (1,3,6,12) then raise exception 'Durata non supportata'; end if;
  if cardinality(p_features) > 20 then raise exception 'Troppi moduli'; end if;
  select count(*) into invalid_count
    from unnest(p_features) f(code)
    left join public.feature_catalog c on c.code=f.code
    where c.code is null;
  if invalid_count > 0 then raise exception 'Modulo non riconosciuto'; end if;
  select coalesce(sum(monthly_cents),0)::integer into extras
    from public.feature_catalog where code = any(p_features) and not is_core;
  full_monthly := full_monthly + extras;
  multiplier := case p_months when 3 then .92 when 6 then .85 when 12 then .75 else 1 end;
  return jsonb_build_object(
    'months', p_months,
    'monthly_cents', full_monthly,
    'total_cents', round(full_monthly * p_months * multiplier)::integer,
    'discount_percent', round((1-multiplier)*100)::integer
  );
end;
$$;

create function public.create_tenant(p_name text, p_slug text, p_months integer, p_features text[] default '{}')
returns uuid language plpgsql security definer set search_path = ''
as $$
declare tenant uuid;
declare creator uuid := auth.uid();
declare quote jsonb;
begin
  if creator is null then raise exception 'Accesso richiesto'; end if;
  if p_slug !~ '^[a-z0-9][a-z0-9-]{2,41}$'
     or p_slug in ('admin','api','auth','static','console','login','signup','support','help','italfut','www')
  then raise exception 'Indirizzo non valido o riservato'; end if;
  if char_length(trim(coalesce(p_name,''))) not between 3 and 90 then
    raise exception 'Nome torneo non valido'; end if;
  if (select count(*) from public.tenants where owner_id = creator) >= 10 then
    raise exception 'Limite di piattaforme raggiunto'; end if;
  quote := public.quote_plan(p_months, p_features);
  insert into public.tenants(owner_id,slug,name)
    values(creator,p_slug,trim(p_name)) returning id into tenant;
  insert into public.tenant_members(tenant_id,user_id,role)
    values(tenant,creator,'owner');
  insert into public.tenant_features(tenant_id,code,enabled,source)
    select tenant,code,true,'included' from public.feature_catalog where is_core;
  insert into public.plan_quotes(tenant_id,months,selected_features,total_cents)
    values(tenant,p_months,p_features,(quote->>'total_cents')::integer);
  -- Only draft created: no grant of paid extras, no false subscription.
  return tenant;
end;
$$;

create function public.request_upgrade(p_tenant_id uuid,p_months integer,p_features text[])
returns uuid language plpgsql security definer set search_path = ''
as $$
declare result uuid;
declare amount integer;
declare multiplier numeric;
declare requested integer;
begin
  if not private.can_manage(p_tenant_id) then raise exception 'Non autorizzato'; end if;
  if p_months not in (1,3,6,12) then raise exception 'Durata non supportata'; end if;
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
  multiplier := case p_months when 3 then .92 when 6 then .85 when 12 then .75 else 1 end;
  amount := round(requested * p_months * multiplier)::integer;
  if amount <= 0 then raise exception 'Importo non valido'; end if;
  insert into public.upgrade_requests(tenant_id,requested_by,requested_features,months,total_cents)
  values(p_tenant_id,auth.uid(),p_features,p_months,amount) returning id into result;
  -- Paid entitlements are NOT changed here. A server-side verified payment
  -- or manual admin operation must write tenant_features in a transaction.
  return result;
end;
$$;

revoke all on function public.create_tenant(text,text,integer,text[]),
  public.request_upgrade(uuid,integer,text[]) from public,anon;
grant execute on function public.create_tenant(text,text,integer,text[]),
  public.request_upgrade(uuid,integer,text[]) to authenticated;
grant execute on function public.quote_plan(integer,text[]) to anon,authenticated;

-- Sports domain. Composite FKs enforce tenant isolation at the relationship level.
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  season_label text,
  status text not null default 'upcoming' check (status in ('upcoming','active','finished')),
  statistics_group text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  unique (tenant_id,id),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index competitions_tenant_idx on public.competitions(tenant_id,status);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  logo_url text,
  accent_hex text,
  created_at timestamptz not null default now(),
  unique (tenant_id,id),
  unique (tenant_id,name),
  check (accent_hex is null or accent_hex ~ '^#[0-9A-Fa-f]{6}$')
);
create index teams_tenant_idx on public.teams(tenant_id);

create table public.competition_teams (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  competition_id uuid not null,
  team_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (tenant_id,competition_id) references public.competitions(tenant_id,id) on delete cascade,
  foreign key (tenant_id,team_id) references public.teams(tenant_id,id) on delete cascade,
  unique (tenant_id,competition_id,team_id)
);
create index competition_teams_tenant_idx on public.competition_teams(tenant_id,competition_id);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  team_id uuid not null,
  first_name text not null check (char_length(trim(first_name)) > 0),
  last_name text not null check (char_length(trim(last_name)) > 0),
  shirt_number integer check (shirt_number between 0 and 99),
  position text check (position is null or position in ('P','D','C','A')),
  profile_image_url text,
  created_at timestamptz not null default now(),
  foreign key (tenant_id,team_id) references public.teams(tenant_id,id) on delete cascade,
  unique (tenant_id,id)
);
create index players_tenant_team_idx on public.players(tenant_id,team_id);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  competition_id uuid not null,
  home_team_id uuid not null,
  away_team_id uuid not null,
  matchday text,
  kickoff_at timestamptz not null,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled','live','finished','postponed')),
  home_score integer check (home_score >= 0),
  away_score integer check (away_score >= 0),
  created_at timestamptz not null default now(),
  unique (tenant_id,id),
  foreign key (tenant_id,competition_id) references public.competitions(tenant_id,id) on delete cascade,
  foreign key (tenant_id,home_team_id) references public.teams(tenant_id,id),
  foreign key (tenant_id,away_team_id) references public.teams(tenant_id,id),
  check (home_team_id <> away_team_id),
  check (status <> 'finished' or (home_score is not null and away_score is not null))
);
create index matches_tenant_kickoff_idx on public.matches(tenant_id,kickoff_at desc);
create index matches_competition_idx on public.matches(tenant_id,competition_id,status);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  match_id uuid not null,
  player_id uuid,
  related_player_id uuid,
  event_type text not null check (event_type in ('goal','assist','yellow_card','red_card','mvp','other')),
  minute smallint check (minute between 0 and 130),
  note text,
  created_at timestamptz not null default now(),
  foreign key (tenant_id,match_id) references public.matches(tenant_id,id) on delete cascade,
  foreign key (tenant_id,player_id) references public.players(tenant_id,id) on delete set null (player_id),
  foreign key (tenant_id,related_player_id) references public.players(tenant_id,id) on delete set null (related_player_id)
);
create unique index one_mvp_per_match_idx on public.match_events(tenant_id,match_id) where event_type='mvp';
create index events_tenant_match_idx on public.match_events(tenant_id,match_id);

create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  role text,
  photo_url text,
  goals integer not null default 0 check (goals >= 0),
  created_at timestamptz not null default now(),
  unique (tenant_id,id)
);

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  award_type text not null check (award_type in ('potm','staff_of_month','top7','mvp','other')),
  month_label text,
  player_id uuid,
  staff_id uuid,
  image_url text,
  created_at timestamptz not null default now(),
  foreign key (tenant_id,player_id) references public.players(tenant_id,id) on delete set null (player_id),
  foreign key (tenant_id,staff_id) references public.staff_members(tenant_id,id) on delete set null (staff_id)
);
create index awards_tenant_idx on public.awards(tenant_id,created_at desc);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  logo_url text,
  image_url text,
  website_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  summary text,
  body text,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index articles_tenant_order_idx on public.articles(tenant_id,sort_order,created_at desc);

create table public.market_slots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  team_id uuid not null,
  slot_number smallint not null check (slot_number between 1 and 6),
  player_name text not null,
  photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (tenant_id,team_id) references public.teams(tenant_id,id) on delete cascade,
  unique (tenant_id,team_id,slot_number)
);

create table public.galleries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  match_id uuid not null,
  label text not null,
  url text not null,
  created_at timestamptz not null default now(),
  foreign key (tenant_id,match_id) references public.matches(tenant_id,id) on delete cascade
);

-- Privilege grants: clients can never directly change tenant status,
-- entitlements, subscription status or prices.
revoke all on all tables in schema public from anon,authenticated;
grant select on public.feature_catalog to anon,authenticated;
grant select on public.tenants to anon,authenticated;
grant update (name,tagline,logo_url,cover_url,brand_color) on public.tenants to authenticated;
grant select on public.profiles,public.tenant_members,public.plan_quotes,public.upgrade_requests,public.subscriptions to authenticated;
grant select on public.tenant_features to anon,authenticated;
grant select on public.competitions,public.teams,public.competition_teams,public.players,public.matches,
  public.match_events,public.staff_members,public.awards,public.sponsors,public.articles,
  public.market_slots,public.galleries to anon,authenticated;
grant insert,update,delete on public.competitions,public.teams,public.competition_teams,
  public.players,public.matches,public.match_events,public.staff_members,public.awards,
  public.sponsors,public.articles,public.market_slots,public.galleries to authenticated;

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.feature_catalog enable row level security;
alter table public.tenant_features enable row level security;
alter table public.plan_quotes enable row level security;
alter table public.upgrade_requests enable row level security;
alter table public.subscriptions enable row level security;
create policy "Own profile only" on public.profiles for select to authenticated using (id=(select auth.uid()));
create policy "Read feature prices" on public.feature_catalog for select to anon,authenticated using (true);
create policy "Read active or own tenants" on public.tenants for select to anon,authenticated
  using (status='active' or (status='draft' and private.is_member(id)));
create policy "Edit own tenant branding" on public.tenants for update to authenticated
  using (private.can_manage(id) and status in ('draft','active'))
  with check (private.can_manage(id) and status in ('draft','active'));
create policy "Read own memberships" on public.tenant_members for select to authenticated
  using (user_id=(select auth.uid()));
create policy "Read public and own feature grants" on public.tenant_features for select to anon,authenticated
  using (private.is_member(tenant_id) or exists (select 1 from public.tenants t where t.id=tenant_id and t.status='active'));
create policy "Own plan quotes" on public.plan_quotes for select to authenticated using (private.is_member(tenant_id));
create policy "Own upgrade requests" on public.upgrade_requests for select to authenticated using (private.is_member(tenant_id));
create policy "Own subscriptions" on public.subscriptions for select to authenticated using (private.is_member(tenant_id));

-- Generating four explicit operations per domain entity keeps rules auditable.
do $$
declare entry record;
begin
  for entry in select * from (values
    ('competitions','competitions'), ('teams','teams'), ('competition_teams','teams'),
    ('players','players'), ('matches','matches'), ('match_events','statistics'),
    ('staff_members','staff'), ('awards','awards'), ('sponsors','sponsors'),
    ('articles','articles'), ('market_slots','market'), ('galleries','gallery')
  ) as m(table_name, feature_code)
  loop
    execute format('alter table public.%I enable row level security', entry.table_name);
    execute format('create policy "read_%s" on public.%I for select to anon,authenticated using (private.can_read(tenant_id,%L))',
      entry.table_name,entry.table_name,entry.feature_code);
    execute format('create policy "insert_%s" on public.%I for insert to authenticated with check (private.can_write(tenant_id,%L))',
      entry.table_name,entry.table_name,entry.feature_code);
    execute format('create policy "update_%s" on public.%I for update to authenticated using (private.can_write(tenant_id,%L)) with check (private.can_write(tenant_id,%L))',
      entry.table_name,entry.table_name,entry.feature_code,entry.feature_code);
    execute format('create policy "delete_%s" on public.%I for delete to authenticated using (private.can_write(tenant_id,%L))',
      entry.table_name,entry.table_name,entry.feature_code);
  end loop;
end;
$$;

-- Keep anonymous access to internal auth metadata impossible.
revoke all on function private.sync_profile() from public,anon,authenticated;
comment on schema private is 'Internal authorization helpers; do not expose through PostgREST API';
comment on function public.create_tenant(text,text,integer,text[]) is
  'Creates draft tenants with core modules only. Payment fulfillment must use a trusted server.';
