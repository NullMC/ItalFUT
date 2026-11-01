-- ItalFUT privacy and deletion controls (2026-11-01)
-- Additive migration. No account, tenant or player is deleted by applying this.
-- Review before enabling the production self-service flows.
begin;

-- Publication of children's personal data requires a deliberate choice.
-- No date of birth or guardian ID is collected by the platform.
alter table public.players
  add column if not exists age_category text
    check (age_category in ('adult', 'minor')),
  add column if not exists guardian_authorization_confirmed boolean not null default false,
  add column if not exists minor_photo_authorized boolean not null default false,
  add column if not exists guardian_confirmed_at timestamptz,
  add column if not exists guardian_confirmed_by uuid references auth.users(id) on delete set null;

alter table public.players
  add constraint players_minor_publication_check
    check (age_category is distinct from 'minor' or guardian_authorization_confirmed),
  add constraint players_minor_photo_check
    check (
      age_category is distinct from 'minor'
      or profile_image_url is null
      or (guardian_authorization_confirmed and minor_photo_authorized)
    );

create or replace function private.stamp_player_publication()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.age_category is null then
    raise exception 'Seleziona la fascia di età prima della pubblicazione';
  end if;
  if new.age_category = 'minor' then
    if not new.guardian_authorization_confirmed then
      raise exception 'Autorizzazione per minorenne non dichiarata';
    end if;
    if new.profile_image_url is not null and btrim(new.profile_image_url) <> ''
       and not new.minor_photo_authorized then
      raise exception 'Autorizzazione alla foto del minore mancante';
    end if;
    -- Record authenticated organizer making the declaration. This is NOT
    -- parental identity verification or proof of signed guardian consent.
    new.guardian_confirmed_by := auth.uid();
    new.guardian_confirmed_at := now();
  else
    new.guardian_authorization_confirmed := false;
    new.minor_photo_authorized := false;
    new.guardian_confirmed_by := null;
    new.guardian_confirmed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists ital_players_publication on public.players;
create trigger ital_players_publication before insert or update on public.players
for each row execute function private.stamp_player_publication();
revoke all on function private.stamp_player_publication() from public, anon, authenticated;

-- Existing players not yet classified must NOT become publicly exposed as adults.
-- Only safely categorized and authorized records are visible to anonymous viewers.
drop policy if exists "read_players" on public.players;
create policy "read_players" on public.players
for select to anon, authenticated
using (
  private.can_read(tenant_id, 'players')
  and (
    private.is_member(tenant_id)
    or (
      age_category is not null
      and (age_category = 'adult' or guardian_authorization_confirmed)
    )
  )
);

-- Deliberate, auditable deletion for tenant owners. No payment ledger deletion
-- while ANY subscription record exists; manual billing/legal review is required.
create or replace function public.delete_my_tenant(
  p_tenant_id uuid, p_confirm_slug text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  current_slug text;
begin
  if current_owner is null then
    raise exception 'Autenticazione richiesta';
  end if;
  select slug into current_slug from public.tenants
  where id = p_tenant_id and owner_id = current_owner
  for update;
  if current_slug is null then
    raise exception 'Piattaforma non trovata o non di tua proprietà';
  end if;
  if p_confirm_slug is distinct from current_slug then
    raise exception 'Il nome di conferma non coincide con lo slug';
  end if;
  if exists(select 1 from public.tenant_members
            where tenant_id = p_tenant_id and user_id <> current_owner) then
    raise exception 'Trasferisci o rimuovi gli altri membri prima di eliminare la piattaforma';
  end if;
  if exists(select 1 from public.subscriptions where tenant_id = p_tenant_id) then
    raise exception 'Esistono dati di sottoscrizione: richiedi assistenza per la chiusura corretta';
  end if;
  delete from public.tenants where id = p_tenant_id and owner_id = current_owner;
end;
$$;

revoke all on function public.delete_my_tenant(uuid,text) from public,anon;
grant execute on function public.delete_my_tenant(uuid,text) to authenticated;
comment on function public.delete_my_tenant(uuid,text) is
  'Owner-only hard deletion with matching slug, no other members and no subscription records. All tenant rows cascade; no invoice records are touched.';

commit;
