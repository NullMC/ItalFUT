import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { client, supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';
import { normalizeUsername, USERNAME_PATTERN } from '../lib/validation';

type AuthContextValue = {
  session: Session | null; profile: Profile | null; loading: boolean; recovery: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (input: { username: string; email: string; password: string }) => Promise<boolean>;
  usernameAvailable: (username: string) => Promise<boolean | null>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
const GENERIC_LOGIN_ERROR = 'Username o password non corretti.';

/** Maps Supabase/Auth errors to safe, non-enumerating Italian messages. */
function authMessage(error: { message?: string; status?: number } | null | undefined, fallback: string) {
  const text = (error?.message ?? '').toLowerCase();
  if (text.includes('email not confirmed')) return 'Conferma prima il tuo indirizzo email dal link che ti abbiamo inviato.';
  if (text.includes('rate limit') || error?.status === 429) return 'Troppi tentativi. Attendi qualche minuto e riprova.';
  if (text.includes('password') && text.includes('weak')) return 'Password troppo debole: usa almeno 10 caratteri con lettere e numeri.';
  if (text.includes('already registered') || text.includes('already exists')) return 'Impossibile completare la registrazione con questi dati. Se hai già un account, accedi.';
  if (text.includes('database error saving new user')) return 'Username non disponibile. Scegline un altro.';
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) { setSession(data.session); setLoading(false); }
    }).catch(() => { if (alive) setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
      setSession(next);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!session?.user) { setProfile(null); return; }
    void Promise.resolve(client().from('profiles').select('id,username,email')
      .eq('id', session.user.id).maybeSingle())
      .then(({ data }) => { if (alive) setProfile((data as Profile | null) ?? null); });
    return () => { alive = false; };
  }, [session?.user?.id]);

  const value = useMemo<AuthContextValue>(() => ({
    session, profile, loading, recovery,
    async signIn(identifier, password) {
      const sb = client();
      const raw = identifier.trim();
      if (!raw || !password || password.length > 128) throw new Error(GENERIC_LOGIN_ERROR);
      if (raw.includes('@')) {
        const { error } = await sb.auth.signInWithPassword({ email: raw.toLowerCase(), password });
        if (error) throw new Error(authMessage(error, GENERIC_LOGIN_ERROR));
        return;
      }
      const username = normalizeUsername(raw);
      if (!USERNAME_PATTERN.test(username)) throw new Error(GENERIC_LOGIN_ERROR);
      const { data, error } = await sb.functions.invoke('auth-username', { body: { username, password } });
      if (error) {
        const response = (error as { context?: Response }).context;
        const status = response?.status;
        const body = await response?.clone().json().catch(() => null) as { code?: string } | null;
        if (status === 429) throw new Error('Troppi tentativi. Attendi qualche minuto e riprova.');
        if (body?.code === 'email_not_confirmed') throw new Error('Conferma prima il tuo indirizzo email dal link che ti abbiamo inviato.');
        if (status === 404 || status === 503 || !status) throw new Error('Accesso con username momentaneamente non disponibile: inserisci la tua email al posto dello username.');
        throw new Error(GENERIC_LOGIN_ERROR);
      }
      if (!data?.access_token || !data?.refresh_token) throw new Error(GENERIC_LOGIN_ERROR);
      const result = await sb.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      if (result.error) throw new Error(GENERIC_LOGIN_ERROR);
    },
    async signUp({ username, email, password }) {
      const { data, error } = await client().auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: {
          data: { username: normalizeUsername(username) },
          emailRedirectTo: window.location.origin + '/accesso',
        },
      });
      if (error) throw new Error(authMessage(error, 'Registrazione non riuscita. Riprova tra poco.'));
      return !data.session;
    },
    async usernameAvailable(username) {
      const { data, error } = await client().rpc('username_available', { p_username: normalizeUsername(username) });
      if (error) return null; // unknown: the server still enforces uniqueness
      return Boolean(data);
    },
    async requestPasswordReset(email) {
      // Always resolve with the same message: never reveal whether an email exists.
      await client().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin + '/reimposta-password',
      }).catch(() => undefined);
    },
    async updatePassword(password) {
      const { error } = await client().auth.updateUser({ password });
      if (error) throw new Error(authMessage(error, 'Aggiornamento non riuscito. Richiedi un nuovo link.'));
      setRecovery(false);
    },
    async signOut() {
      const { error } = await client().auth.signOut();
      if (error) await client().auth.signOut({ scope: 'local' });
    },
  }), [session, profile, loading, recovery]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider mancante');
  return context;
}
