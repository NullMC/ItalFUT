/*
 * Stripe payments (hosted Checkout). The browser only asks the Edge Function to start a
 * checkout for a tournament: the price is computed in the database and the plan is
 * activated by the Stripe webhook, never by the browser.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';
import { client } from './supabase';

/** Turn on in Cloudflare Pages (VITE_PAYMENTS_ENABLED=true) once Stripe is set up. */
export const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';

export type Payment = {
  id: string; status: 'pending' | 'paid' | 'failed' | 'expired' | 'refunded'; months: number; features: string[];
  amount_cents: number; amount_paid_cents: number | null; paid_at: string | null; period_start: string | null; period_end: string | null; created_at: string;
};

/** Creates the Checkout Session and leaves the page for Stripe's hosted payment page. */
export async function startCheckout(tenantId: string, months: number, features: string[]) {
  const { data, error } = await client().functions.invoke('create-checkout-session', {
    body: { tenant_id: tenantId, months, features },
  });
  if (error) {
    let message = 'Impossibile avviare il pagamento. Riprova più tardi.';
    if (error instanceof FunctionsHttpError) {
      try { const body = await error.context.json(); if (body?.error) message = String(body.error); } catch { /* keep default */ }
    }
    throw new Error(message);
  }
  if (!data?.url) throw new Error('Impossibile avviare il pagamento. Riprova più tardi.');
  window.location.assign(String(data.url));
}

export const PAYMENT_STATUS: Record<Payment['status'], string> = {
  pending: 'In attesa', paid: 'Pagato', failed: 'Non riuscito', expired: 'Scaduto', refunded: 'Rimborsato',
};
