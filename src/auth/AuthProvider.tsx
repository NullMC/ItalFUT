import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { client, supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';
import { generateRecoveryCode, normalizeUsername, PASSWORD_MAX, usernameToEmail, USERNAME_PATTERN } from '../lib/validation';

/**
 * Username + password authentication, entirely inside Supabase.
 * No email is ever sent: sign-up returns a session immediately ("Confirm email" is
 * disabled in the project) and password recovery uses a one-time recovery code.
 */
export type Role = 'guest' | 'user' | 'admin';
/** Landing page of each role after sign-in. */
export const roleHome = (role: Role) => role === 'admin' ? '/admin' : role === 'user' ? '/console' : '/';
export const roleLabel: Record<Role, string> = { guest: 'Ospite', user: 'Organizzatore', admin: 'Superadmin' };

type AuthContextValue = {
  session: Session | null; profile: Profile | null; loading: boolean;
  /** Platform superadmin (null while checking). */
  isAdmin: boolean | null;
  /** What the interface shows: null while the role of a signed-in user is being resolved. */
  role: Role | null;
  /** Re-reads profile and role from the database (also runs on focus and every minute). */
  refresh: () => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  /** Creates the account and returns the recovery code to show once. */
  signUp: (input: { username: string; password: string }) => Promise<string>;
  usernameAvailable: (username: string) => Promise<boolean | null>;
  resetWithCode: (input: { username: string; code: string; password: string }) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  regenerateRecoveryCode: () => Promise<string>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
const GENERIC_LOGIN_ERROR = 'Username o password non corretti.';
/** Configuration problems: precise instructions in development, neutral text for visitors. */
const SETUP = (hint: string) => import.meta.env.DEV ? 'Configurazione: ' + hint : 'La registrazione non è al momento disponibile. Riprova più tardi.';

function authMessage(error: { message?: string; status?: number; code?: string } | null | undefined, fallback: string) {
  const text = (error?.message ?? '').toLowerCase();
  if (text.includes('rate limit') || error?.status === 429) return 'Troppi tentativi. Attendi qualche minuto e riprova.';
  if (text.includes('email not confirmed')) return SETUP('Account non attivo: in Supabase → Authentication → Sign In / Providers → Email disattiva “Confirm email”.');
  if (text.includes('password') && (text.includes('weak') || text.includes('short'))) return 'Password troppo debole: usa almeno 10 caratteri con lettere e numeri.';
  if (text.includes('already registered') || text.includes('already exists') || text.includes('database error saving new user')) return 'Questo username non è disponibile. Scegline un altro.';
  if (text.includes('signups not allowed')) return 'Le registrazioni sono momentaneamente chiuse.';
  // Supabase validates the address only when it must send a confirmation email:
  // with "Confirm email" disabled (required for username-only accounts) this does not happen.
  if (error?.code === 'email_address_invalid' || text.includes('is invalid')) return SETUP('Registrazione bloccata da Supabase: in Authentication → Sign In / Providers → Email disattiva “Confirm email” e riprova.');
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) { setSession(data.session); setLoading(false); }
    }).catch(() => { if (alive) setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      // Token refresh / profile change: re-read the role without waiting for the next tick.
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') window.setTimeout(() => void refreshRef.current(), 0);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const userId = session?.user?.id ?? null;
  const userRef = useRef<string | null>(null);
  userRef.current = userId;

  /**
   * Profile + role check. The server re-checks permissions on every admin call;
   * this only decides what the interface shows, so it errs on the side of "user".
   */
  const refresh = useCallback(async () => {
    const id = userRef.current;
    if (!supabase || !id) return;
    const [profileResult, adminResult] = await Promise.all([
      Promise.resolve(supabase.from('profiles').select('id,username').eq('id', id).maybeSingle()),
      Promise.resolve(supabase.rpc('am_i_admin')),
    ]);
    if (userRef.current !== id) return; // signed out or switched account meanwhile
    if (!profileResult.error) setProfile((profileResult.data as Profile | null) ?? null);
    // Keep the last known role on network errors; a definitive answer replaces it.
    if (!adminResult.error) setIsAdmin(adminResult.data === true);
    else setIsAdmin(previous => previous ?? false);
  }, []);

  // New user (or sign-out): reset and resolve the role from scratch.
  useEffect(() => {
    if (!userId) { setProfile(null); setIsAdmin(false); return; }
    setProfile(null); setIsAdmin(null);
    void refresh();
  }, [userId, refresh]);

  // Constant session check: verifies the session with the server (a deleted account or a
  // password reset from the dashboard logs the browser out) and refreshes the role, so
  // promoting or demoting a superadmin is reflected without signing in again.
  useEffect(() => {
    if (!supabase || !userId) return;
    const sb = supabase;
    let running = false;
    const check = async () => {
      if (running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        const { error } = await sb.auth.getUser();
        if (error && (error.status === 401 || error.status === 403 || /session|jwt|not found/i.test(error.message))) {
          await sb.auth.signOut({ scope: 'local' });
          return;
        }
        await refresh();
      } finally { running = false; }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void check(); };
    const timer = window.setInterval(() => void check(), 60_000);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onVisible); document.removeEventListener('visibilitychange', onVisible); };
  }, [userId, refresh]);

  refreshRef.current = refresh;
  const role: Role | null = !session ? 'guest' : isAdmin === null ? null : isAdmin ? 'admin' : 'user';

  const value = useMemo<AuthContextValue>(() => ({
    session, profile, loading, isAdmin, role, refresh,
    async signIn(identifier, password) {
      const raw = identifier.trim();
      if (!raw || !password || new TextEncoder().encode(password).length > PASSWORD_MAX) throw new Error(GENERIC_LOGIN_ERROR);
      // Accounts created before the email-free switch can still sign in with their address.
      const email = raw.includes('@') ? raw.toLowerCase() : usernameToEmail(raw);
      if (!raw.includes('@') && !USERNAME_PATTERN.test(normalizeUsername(raw))) throw new Error(GENERIC_LOGIN_ERROR);
      const { error } = await client().auth.signInWithPassword({ email, password });
      if (error) throw new Error(authMessage(error, GENERIC_LOGIN_ERROR));
    },
    async signUp({ username, password }) {
      const name = normalizeUsername(username);
      const sb = client();
      const { data, error } = await sb.auth.signUp({ email: usernameToEmail(name), password, options: { data: { username: name } } });
      if (error) throw new Error(authMessage(error, 'Registrazione non riuscita. Riprova tra poco.'));
      if (!data.session) throw new Error(SETUP('Account creato ma non attivo: in Supabase disattiva “Confirm email”, poi accedi con username e password.'));
      const code = generateRecoveryCode();
      const { error: codeError } = await sb.rpc('set_recovery_code', { p_code: code });
      if (codeError) throw new Error('Account creato, ma non è stato possibile generare il codice di recupero. Generalo dalla pagina Account.');
      return code;
    },
    async usernameAvailable(username) {
      const { data, error } = await client().rpc('username_available', { p_username: normalizeUsername(username) });
      if (error) return null; // unknown: the database still enforces uniqueness
      return Boolean(data);
    },
    async resetWithCode({ username, code, password }) {
      const { data, error } = await client().rpc('reset_password_with_code', {
        p_username: normalizeUsername(username), p_code: code.trim().toUpperCase(), p_new_password: password,
      });
      if (error) throw new Error(/troppi/i.test(error.message) ? error.message : 'Reimpostazione non riuscita. Riprova più tardi.');
      if (!data) throw new Error('Username o codice di recupero non corretti.');
    },
    async changePassword(current, next) {
      const sb = client();
      const email = session?.user.email;
      if (!email) throw new Error('Sessione non valida. Accedi di nuovo.');
      const check = await sb.auth.signInWithPassword({ email, password: current });
      if (check.error) throw new Error('La password attuale non è corretta.');
      const { error } = await sb.auth.updateUser({ password: next });
      if (error) throw new Error(authMessage(error, 'Aggiornamento non riuscito. Riprova.'));
    },
    async regenerateRecoveryCode() {
      const code = generateRecoveryCode();
      const { error } = await client().rpc('set_recovery_code', { p_code: code });
      if (error) throw new Error('Non è stato possibile generare un nuovo codice. Riprova.');
      return code;
    },
    async signOut() {
      const { error } = await client().auth.signOut();
      if (error) await client().auth.signOut({ scope: 'local' });
    },
  }), [session, profile, loading, isAdmin, role, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider mancante');
  return context;
}
