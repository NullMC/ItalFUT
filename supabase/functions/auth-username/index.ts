// Username -> email lookup using service role ONLY in the Edge runtime.
// Password verification and account rate limits are delegated to Supabase Auth.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const serverUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const origins = (Deno.env.get('ITALFUT_ALLOWED_ORIGINS') ?? 'http://localhost:5173')
  .split(',').map(value => value.trim()).filter(Boolean);

function json(body: Record<string, unknown>, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...(origin && origins.includes(origin) ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}),
    },
  });
}
Deno.serve(async request => {
  const origin = request.headers.get('origin');
  if (origin && !origins.includes(origin)) return json({ error: 'Origine non autorizzata' }, 403, null);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'access-control-allow-origin': origin ?? origins[0] ?? 'http://localhost:5173',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
      'access-control-max-age': '600',
      vary: 'Origin',
    } });
  }
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405, origin);
  if (!serverUrl || !anonKey || !serviceKey) return json({ error: 'Servizio non disponibile' }, 503, origin);
  if (Number(request.headers.get('content-length') ?? 0) > 4096) return json({ error: 'Richiesta non valida' }, 400, origin);
  try {
    const body = await request.json() as { username?: unknown; password?: unknown };
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!/^[a-z0-9_]{3,30}$/.test(username) || !password || password.length > 1024)
      return json({ error: 'Credenziali non valide' }, 401, origin);
    const admin = createClient(serverUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: lookupError } = await admin.from('profiles')
      .select('email').eq('username', username).maybeSingle();
    if (lookupError || !profile?.email) return json({ error: 'Credenziali non valide' }, 401, origin);
    const authClient = createClient(serverUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: result, error } = await authClient.auth.signInWithPassword({ email: profile.email, password });
    if (error || !result.session) return json({ error: 'Credenziali non valide' }, 401, origin);
    return json({ access_token: result.session.access_token, refresh_token: result.session.refresh_token }, 200, origin);
  } catch {
    return json({ error: 'Credenziali non valide' }, 401, origin);
  }
});
