-- Stripe promotion codes managed from the superadmin ("Codici sconto").
-- Codes live in Stripe (coupon + promotion code), created by the admin-promotions Edge
-- Function. Here: the discount applied to each payment, and an audited log of the actions.
-- Run after 202611090001_event_tournaments.sql. Safe to run more than once.
begin;

-- Discount recorded by the Stripe webhook (amount_cents stays the list price).
alter table public.payments add column if not exists discount_cents integer not null default 0 check (discount_cents >= 0);
alter table public.payments add column if not exists promotion_code text;

-- Audit log accepts the Stripe actions.
alter table public.admin_audit_log drop constraint if exists admin_audit_log_action_check;
alter table public.admin_audit_log add constraint admin_audit_log_action_check
  check (action in ('insert', 'update', 'delete', 'set_password', 'stripe_create', 'stripe_update'));

-- Called by the Edge Function with the admin's own token: only a superadmin can log.
create or replace function public.admin_log_stripe(p_action text, p_object text, p_key jsonb, p_after jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  if p_action not in ('stripe_create', 'stripe_update') then raise exception 'Azione non valida'; end if;
  insert into public.admin_audit_log(admin_id, action, table_name, row_key, after)
    values (auth.uid(), p_action, 'stripe.' || left(coalesce(p_object, 'object'), 40), p_key, p_after);
end;
$$;
revoke all on function public.admin_log_stripe(text, text, jsonb, jsonb) from public, anon;
grant execute on function public.admin_log_stripe(text, text, jsonb, jsonb) to authenticated;

commit;
