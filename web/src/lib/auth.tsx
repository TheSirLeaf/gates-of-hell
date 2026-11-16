import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { PREVIEW, PREVIEW_ROLE } from '../dev/preview';
import { MOCK_PROFILE } from '../dev/mock';
import type { Profile } from './types';

/** Resultado de entrar/cadastrar. `needsConfirmation`: a conta existe, mas o e-mail ainda não foi confirmado. */
export interface AuthResult {
  error: string | null;
  needsConfirmation?: boolean;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Mestre de verdade. */
  isMaster: boolean;
  isAdmin: boolean;
  adminMode: boolean;
  /** Tem permissão de mestre agora: mestre, ou admin com o modo suporte ligado. */
  masterAccess: boolean;
  setSupportMode: (on: boolean) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  resendConfirmation: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(PREVIEW ? ({ user: { id: 'me' } } as Session) : null);
  const [profile, setProfile] = useState<Profile | null>(PREVIEW ? MOCK_PROFILE(PREVIEW_ROLE) : null);
  const [loading, setLoading] = useState(!PREVIEW);

  const loadProfile = useCallback(async (userId: string) => {
    // O perfil é criado por trigger no cadastro; tenta algumas vezes por causa da latência.
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase.from('profiles').select('id, display_name, role, admin_mode').eq('id', userId).maybeSingle();
      if (data) {
        setProfile(data as Profile);
        return;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    setProfile(null);
  }, []);

  useEffect(() => {
    if (PREVIEW) return;
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setProfile(null);
      // Não chamar o Supabase direto dentro do callback (deadlock conhecido): adia.
      else setTimeout(() => void loadProfile(next.user.id), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      profile,
      isMaster: profile?.role === 'master',
      isAdmin: profile?.role === 'admin',
      adminMode: profile?.role === 'admin' && profile.admin_mode,
      masterAccess: profile?.role === 'master' || (profile?.role === 'admin' && profile.admin_mode),
      setSupportMode: async (on) => {
        if (PREVIEW) {
          setProfile((p) => (p ? { ...p, admin_mode: on } : p));
          return null;
        }
        const { error } = await supabase.rpc('set_admin_mode', { p_on: on });
        if (error) return error.message;
        if (session) await loadProfile(session.user.id);
        return null;
      },
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) return { error: null };
        if (isUnconfirmed(error.message)) {
          return { error: 'Seu e-mail ainda não foi confirmado. Abra o link que enviamos ou peça um novo.', needsConfirmation: true };
        }
        return { error: translateAuthError(error.message) };
      },
      signUp: async (email, password, displayName) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            // o link do e-mail volta para ESTE site (senão o Supabase usa o "Site URL" padrão, que costuma ser localhost)
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) return { error: translateAuthError(error.message) };
        // Com confirmação ligada, e-mail já cadastrado NÃO dá erro: volta um usuário sem identidades.
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          return { error: 'Este e-mail já tem conta. Entre com ele (ou confirme o e-mail, se ainda não confirmou).', needsConfirmation: true };
        }
        if (!data.session) return { error: null, needsConfirmation: true };
        return { error: null };
      },
      resendConfirmation: async (email) => {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        return error ? translateAuthError(error.message) : null;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshProfile: async () => {
        if (session) await loadProfile(session.user.id);
      },
    }),
    [loading, session, profile, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}

const isUnconfirmed = (message: string): boolean => {
  const m = message.toLowerCase();
  return m.includes('not confirmed') || m.includes('email_not_confirmed');
};

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('signups not allowed') || m.includes('signups are disabled') || m.includes('signup is disabled')) {
    return 'O cadastro está desligado no Supabase. Ligue "Allow new users to sign up" (veja o guia).';
  }
  if (m.includes('expired') || m.includes('otp')) return 'O link expirou ou já foi usado. Peça um novo e-mail de confirmação.';
  if (m.includes('security purposes') || m.includes('after ')) return 'Espere alguns segundos antes de pedir outro e-mail.';
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('already registered')) return 'Este e-mail já tem conta. Entre com ele.';
  if (m.includes('password should be')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  if (m.includes('valid email') || m.includes('invalid email')) return 'E-mail inválido.';
  return message;
}
