-- Tournament images uploaded from the organizer's computer (logos, photos, covers).
-- Supabase Storage only: no other provider. Re-runnable.
--
-- Layout:  tenant-media/<tenant_id>/<field>/<random>.webp
-- - Public bucket: tournament sites show these images to anyone; names are random UUIDs.
-- - Only WebP, max 2 MB (the browser converts and resizes before uploading).
-- - Upload / delete: staff who can edit the tournament (owner, admin, editor) or a
--   platform superadmin. Nobody can overwrite an existing file (no update policy).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenant-media', 'tenant-media', true, 2097152, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Tournaments deleted by their owner: lets the owner remove the tournament's files right
-- after the deletion (files can only be removed through the Storage API, not SQL).
create table if not exists private.deleted_tenants (
  tenant_id uuid primary key,
  owner_id uuid not null,
  deleted_at timestamptz not null default now()
);
revoke all on private.deleted_tenants from public, anon, authenticated;

-- True when the object path belongs to a tournament the current user may edit.
-- Validates the path before casting, so malformed names are simply refused.
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
  return private.can_manage(v_tenant) or private.is_platform_admin();
end;
$$;
revoke all on function private.can_manage_media(text) from public, anon;
grant execute on function private.can_manage_media(text) to authenticated;

drop policy if exists "tenant_media_insert" on storage.objects;
drop policy if exists "tenant_media_select" on storage.objects;
drop policy if exists "tenant_media_delete" on storage.objects;

create policy "tenant_media_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'tenant-media' and private.can_manage_media(name));
-- Listing (needed to clean up a tournament's files) and the read step of a delete.
-- Public reading of the images goes through the public URL and needs no policy.
create policy "tenant_media_select" on storage.objects for select to authenticated
  using (bucket_id = 'tenant-media' and private.can_manage_media(name));
create policy "tenant_media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'tenant-media' and private.can_manage_media(name));

-- Same rules as before (202611010001), plus the record above.
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
  insert into private.deleted_tenants(tenant_id, owner_id) values (p_tenant_id, current_owner)
  on conflict (tenant_id) do update set owner_id = excluded.owner_id, deleted_at = now();
  delete from public.tenants where id = p_tenant_id and owner_id = current_owner;
end;
$$;
revoke all on function public.delete_my_tenant(uuid,text) from public, anon;
grant execute on function public.delete_my_tenant(uuid,text) to authenticated;
