import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const configured = Boolean(url && key);
export const supabase = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
export function client() {
  if (!supabase) throw new Error('Configura le variabili VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY prima di continuare.');
  return supabase;
}
export function friendlyError(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Operazione non riuscita. Riprova.';
}
