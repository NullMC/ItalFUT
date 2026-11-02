import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
// Publishable key (new name) or legacy anon key: both are public, never the service_role key.
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim();
export const configured = Boolean(url && key);
/**
 * Shown when the build has no Supabase variables. Developers get the fix;
 * visitors of a misconfigured deploy get a neutral message, never technical details.
 */
export const notConfiguredMessage = import.meta.env.DEV
  ? 'Sviluppo: mancano VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY. Copia .env.example in .env.local e riavvia "npm run dev".'
  : 'Il servizio non è al momento disponibile. Riprova più tardi.';
export const supabase = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
export function client() {
  if (!supabase) throw new Error('Configura le variabili VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY prima di continuare.');
  return supabase;
}
export function friendlyError(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Operazione non riuscita. Riprova.';
}
