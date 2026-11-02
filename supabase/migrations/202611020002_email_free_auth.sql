-- ItalFUT | 202611020002_email_free_auth.sql
-- Everything runs inside Supabase: no email is ever sent to users.
--   * accounts are username + password (the Auth email is an internal, undeliverable alias);
--   * password recovery uses a one-time recovery code shown at sign-up;
--   * account deletion and support / privacy requests are SQL functions and tables.
-- Prerequisite in the Dashboard: Authentication → Sign In / Providers → Email → "Confirm email" OFF.
-- Idempotent: safe to run more than once.
begin;

-- 1) Recovery codes (bcrypt hash only; the plain code is shown once to the user).
create table if not exists private.recovery_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now()
);
revoke all on private.recovery_codes from public, anon, authenticated;

create or replace function public.set_recovery_code(p_code text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  if p_code is null or p_code !~ '^[A-Z0-9-]{19,40}$' then raise exception 'Codice non valido'; end if;
  insert into private.recovery_codes(user_id, code_hash)
  values (auth.uid(), extensions.crypt(p_code, extensions.gen_salt('bf', 10)))
  on conflict (user_id) do update set code_hash = excluded.code_hash, created_at = now();
end;
$$;
revoke all on function public.set_recovery_code(text) from public, anon;
grant execute on function public.set_recovery_code(text) to authenticated;

create or replace function public.has_recovery_code()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from private.recovery_codes where user_id = auth.uid()); $$;
revoke all on function public.has_recovery_code() from public, anon;
grant execute on function public.has_recovery_code() to authenticated;

-- Client IP as forwarded by the Supabase API gateway (used only for throttling).
create or replace function private.client_ip() returns text language sql stable set search_path = ''
as $$
  select coalesce(nullif(split_part(coalesce(
    nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1), ''), 'unknown');
$$;

-- 2) Password reset with username + recovery code. Generic failure, throttled,
--    one-time code, every session of the account is revoked on success.
create or replace function public.reset_password_with_code(p_username text, p_code text, p_new_password text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  target uuid;
  stored text;
  name text := lower(coalesce(p_username, ''));
begin
  if not public.auth_throttle('reset:' || name, 5, 3600)
     or not public.auth_throttle('reset-ip:' || private.client_ip(), 20, 3600) then
    raise exception 'Troppi tentativi. Riprova tra un''ora.';
  end if;
  if p_new_password is null or char_length(p_new_password) < 10 or octet_length(p_new_password) > 72 then
    raise exception 'La nuova password deve avere da 10 a 72 caratteri.';
  end if;
  select p.id, r.code_hash into target, stored
    from public.profiles p join private.recovery_codes r on r.user_id = p.id
   where p.username = name;
  if target is null or stored is null or extensions.crypt(upper(coalesce(p_code, '')), stored) <> stored then
    return false;
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)), updated_at = now()
   where id = target;
  delete from auth.sessions where user_id = target;
  delete from private.recovery_codes where user_id = target;
  perform public.auth_throttle_reset('reset:' || name);
  return true;
end;
$$;
revoke all on function public.reset_password_with_code(text, text, text) from public;
grant execute on function public.reset_password_with_code(text, text, text) to anon, authenticated;

-- 3) Self-service account deletion (replaces the delete-account Edge Function).
-- Returns false for a wrong password (no exception, so the throttle row is kept).
drop function if exists public.delete_my_account(text, text);
create or replace function public.delete_my_account(p_password text, p_confirmation text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  stored text;
begin
  if me is null then raise exception 'Accesso richiesto'; end if;
  if p_confirmation is distinct from 'ELIMINA ACCOUNT' then raise exception 'Conferma non valida'; end if;
  if not public.auth_throttle('delete:' || me::text, 5, 3600) then raise exception 'Troppi tentativi. Riprova più tardi.'; end if;
  select encrypted_password into stored from auth.users where id = me;
  if stored is null or extensions.crypt(coalesce(p_password, ''), stored) <> stored then
    return false;
  end if;
  if exists(select 1 from public.tenants where owner_id = me) then
    raise exception 'Elimina prima i tornei di cui sei proprietario.';
  end if;
  if exists(select 1 from public.upgrade_requests where requested_by = me and status = 'pending') then
    raise exception 'Hai richieste di moduli in attesa: annullale o attendi la risposta prima di eliminare l''account.';
  end if;
  delete from public.upgrade_requests where requested_by = me;
  delete from auth.users where id = me; -- cascades to profile, memberships, sessions, recovery code, requests
  return true;
end;
$$;
revoke all on function public.delete_my_account(text, text) from public, anon;
grant execute on function public.delete_my_account(text, text) to authenticated;

-- 4) Support / privacy requests stored in the database (operator answers from the Dashboard).
create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in ('privacy', 'support', 'minor', 'billing', 'other')),
  message text not null check (char_length(message) between 10 and 4000),
  contact text check (contact is null or char_length(contact) <= 200),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  reply text check (reply is null or char_length(reply) <= 4000),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists support_requests_user_idx on public.support_requests(user_id, created_at desc);
alter table public.support_requests enable row level security;
revoke all on public.support_requests from anon, authenticated;
grant select on public.support_requests to authenticated;
drop policy if exists "Own requests" on public.support_requests;
create policy "Own requests" on public.support_requests for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.submit_request(p_kind text, p_message text, p_contact text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare result uuid;
begin
  if not public.auth_throttle('request:' || coalesce(auth.uid()::text, private.client_ip()), 5, 3600) then
    raise exception 'Hai inviato troppe richieste. Riprova tra un''ora.';
  end if;
  insert into public.support_requests(user_id, kind, message, contact)
  values (auth.uid(), p_kind, btrim(p_message), nullif(btrim(coalesce(p_contact, '')), ''))
  returning id into result;
  return result;
end;
$$;
revoke all on function public.submit_request(text, text, text) from public;
grant execute on function public.submit_request(text, text, text) to anon, authenticated;

commit;
