import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { client, supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

type AuthContextValue = {
  session: Session | null; profile: Profile | null; loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (email: string, username: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) { setSession(data.session); setLoading(false); }
    }).catch(() => { if (alive) setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!session?.user) { setProfile(null); return; }
    void client().from('profiles').select('id,username,full_name,email')
      .eq('id', session.user.id).maybeSingle()
      .then(({ data }) => { if (alive) setProfile((data as Profile | null) ?? null); });
    return () => { alive = false; };
  }, [session?.user?.id]);

  const value = useMemo<AuthContextValue>(() => ({
    session, profile, loading,
    async signIn(identifier, password) {
      const sb = client();
      if (identifier.includes('@')) {
        const { error } = await sb.auth.signInWithPassword({ email: identifier.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await sb.functions.invoke('auth-username', {
          body: { username: identifier.trim().toLowerCase(), password },
        });
        if (error || !data?.access_token || !data?.refresh_token)
          throw new Error('Credenziali non valide o accesso non disponibile.');
        const result = await sb.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
        if (result.error) throw result.error;
      }
    },
    async signUp(email, username, password) {
      const { data, error } = await client().auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: { data: { username: username.trim().toLowerCase() } },
      });
      if (error) throw error;
      return !data.session;
    },
    async signOut() {
      const { error } = await client().auth.signOut();
      if (error) throw error;
    },
  }), [session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider mancante');
  return context;
}
