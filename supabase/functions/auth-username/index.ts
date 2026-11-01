// Username + password sign-in.
// The browser never learns which email belongs to a username: the lookup and the
// password check both happen here, and only a session is returned on success.
// Throttled per username and per client IP (public.auth_throttle, service role only).
// Deploy: supabase functions deploy auth-username --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const serverUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const origins = (Deno.env.get('ITALFUT_ALLOWED_ORIGINS') ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(value => value.trim()).filter(Boolean);

function headers(origin: string | null): Record<string, string> {
  return {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    vary: 'Origin',
    ...(origin && origins.includes(origin) ? { 'access-control-allow-origin': origin } : {}),
  };
}
const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: headers(origin) });
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async request => {
  const started = Date.now();
  const origin = request.headers.get('origin');
  if (origin && !origins.includes(origin)) return json({ error: 'Origine non autorizzata' }, 403, null);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      ...(origin ? { 'access-control-allow-origin': origin } : {}),
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
      'access-control-max-age': '600', vary: 'Origin',
    } });
  }
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405, origin);
  if (!serverUrl || !anonKey || !serviceKey) return json({ error: 'Servizio non disponibile' }, 503, origin);
  if (Number(request.headers.get('content-length') ?? 0) > 2048) return json({ error: 'Richiesta non valida' }, 400, origin);

  // Uniform response time makes username probing by timing impractical.
  const fail = async (status = 401, body: Record<string, unknown> = { error: 'Credenziali non valide' }) => {
    const elapsed = Date.now() - started;
    if (elapsed < 700) await sleep(700 - elapsed + Math.random() * 150);
    return json(body, status, origin);
  };

  let username = '', password = '';
  try {
    const body = await request.json() as { username?: unknown; password?: unknown };
    username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    password = typeof body.password === 'string' ? body.password : '';
  } catch { return fail(400, { error: 'Richiesta non valida' }); }
  if (!/^[a-z0-9_]{3,30}$/.test(username) || !password || password.length > 128) return fail();

  const admin = createClient(serverUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  try {
    const [byUser, byIp] = await Promise.all([
      admin.rpc('auth_throttle', { p_bucket: 'u:' + username, p_max: 8, p_window_seconds: 900 }),
      admin.rpc('auth_throttle', { p_bucket: 'ip:' + ip, p_max: 30, p_window_seconds: 900 }),
    ]);
    if (byUser.data === false || byIp.data === false) return fail(429, { error: 'Troppi tentativi' });

    const { data: profile } = await admin.from('profiles').select('email').eq('username', username).maybeSingle();
    if (!profile?.email) return fail();
    const authClient = createClient(serverUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: result, error } = await authClient.auth.signInWithPassword({ email: profile.email, password });
    password = '';
    if (error?.message?.toLowerCase().includes('email not confirmed')) return fail(403, { error: 'Email non confermata', code: 'email_not_confirmed' });
    if (error || !result.session) return fail();
    await admin.rpc('auth_throttle_reset', { p_bucket: 'u:' + username });
    return json({ access_token: result.session.access_token, refresh_token: result.session.refresh_token }, 200, origin);
  } catch {
    return fail();
  }
});
