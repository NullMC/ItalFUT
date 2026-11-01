// Self-service account erasure after explicit typed confirmation and password reauthentication.
// JWT required by the Supabase gateway AND verified against Auth by this function.
// No service-role key is ever sent to the browser.
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const origins = (Deno.env.get('ITALFUT_ALLOWED_ORIGINS') ??
  'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(value => value.trim()).filter(Boolean);

function response(body: Record<string, unknown>, status: number, origin: string | null) {
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
  if (origin && !origins.includes(origin)) {
    return response({ error: 'Origine non autorizzata' }, 403, null);
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...(origin && origins.includes(origin) ? { 'access-control-allow-origin': origin } : {}),
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
        'access-control-max-age': '600', vary: 'Origin',
      },
    });
  }
  if (request.method !== 'POST') return response({ error: 'Metodo non consentito' }, 405, origin);
  if (!url || !anonKey || !serviceKey) return response({ error: 'Servizio non configurato' }, 503, origin);
  if (Number(request.headers.get('content-length') ?? 0) > 4096)
    return response({ error: 'Richiesta non valida' }, 400, origin);

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!token || token.length > 9000) return response({ error: 'Accesso richiesto' }, 401, origin);
  let password: string;
  try {
    const body = await request.json() as { password?: unknown; confirmation?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
    if (body.confirmation !== 'ELIMINA ACCOUNT' || password.length < 8 || password.length > 1024)
      return response({ error: 'Conferma o password non valide' }, 400, origin);
  } catch { return response({ error: 'Richiesta non valida' }, 400, origin); }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    const { data: auth, error: authIssue } = await admin.auth.getUser(token);
    if (authIssue || !auth.user?.id || !auth.user.email)
      return response({ error: 'Sessione scaduta o non verificabile' }, 401, origin);
    const user = auth.user;

    // Reauthenticate the exact account; a stolen but otherwise valid bearer JWT
    // is not sufficient to trigger permanent deletion.
    const verifier = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: reauth, error: reauthIssue } = await verifier.auth.signInWithPassword({
      email: user.email, password,
    });
    password = ''; // Never persist the password or send it to a logger.
    if (reauthIssue || reauth.user?.id !== user.id) {
      return response({ error: 'Password non corretta' }, 401, origin);
    }

    // Refuse deletion when it could erase other participants' data or
    // conflict with existing billing/legal records. The user must first
    // delete their tenant(s) through the guarded owner-only RPC.
    const [tenants, upgrades] = await Promise.all([
      admin.from('tenants').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
      admin.from('upgrade_requests').select('id', { count: 'exact', head: true }).eq('requested_by', user.id),
    ]);
    if (tenants.error || upgrades.error)
      return response({ error: 'Verifica account non disponibile. Riprova più tardi.' }, 503, origin);
    if ((tenants.count ?? 0) > 0)
      return response({ error: 'Elimina o trasferisci prima i tuoi tornei. I dati degli altri partecipanti devono essere tutelati.' }, 409, origin);
    if ((upgrades.count ?? 0) > 0)
      return response({ error: 'Sono presenti richieste commerciali da verificare. Contatta l’assistenza prima della cancellazione.' }, 409, origin);

    const { error: deletionIssue } = await admin.auth.admin.deleteUser(user.id);
    if (deletionIssue) return response({ error: 'Cancellazione non completata. Contatta l’assistenza.' }, 503, origin);
    return response({ deleted: true }, 200, origin);
  } catch {
    return response({ error: 'Cancellazione non completata. Riprova oppure contatta l’assistenza.' }, 503, origin);
  }
});
