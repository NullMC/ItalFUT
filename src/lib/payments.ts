/*
 * Stripe payments (hosted Checkout). The browser only asks the Edge Function to start a
 * checkout for a tournament: the price is computed in the database and the plan is
 * activated by the Stripe webhook, never by the browser.
 */
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
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
      const response = error.context as Response;
      let body: { error?: unknown; code?: unknown } | null = null;
      try { body = await response.json(); } catch { /* not JSON */ }
      if (body?.error) message = String(body.error);
      // Supabase answers 404 NOT_FOUND when the Edge Function has not been deployed.
      else if (response.status === 404 || body?.code === 'NOT_FOUND') message = 'Pagamenti non ancora attivi: la funzione create-checkout-session non è pubblicata su Supabase.';
      else if (response.status === 401) message = 'Sessione scaduta o funzione pubblicata senza --no-verify-jwt: accedi di nuovo o ripubblica la funzione.';
    } else if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
      message = 'Servizio di pagamento non raggiungibile: controlla la connessione e il valore DOMAIN su Supabase (deve essere l’indirizzo da cui apri il sito).';
    }
    throw new Error(message);
  }
  if (!data?.url) throw new Error('Impossibile avviare il pagamento. Riprova più tardi.');
  window.location.assign(String(data.url));
}

export const PAYMENT_STATUS: Record<Payment['status'], string> = {
  pending: 'In attesa', paid: 'Pagato', failed: 'Non riuscito', expired: 'Scaduto', refunded: 'Rimborsato',
};
