import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase';
import { vincularConta } from '../onboarding/aiClient';

const DEMO_KEY = 'grao.auth.demo.v1';

type AuthContextValue = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  /** Sessão real ou modo demo local (sem Supabase). */
  isAuthenticated: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
  /** Entra no app sem Supabase (dev / demo). */
  enterDemo: () => Promise<void>;
  /** Sincroniza sessão após login explícito (evita corrida com o listener). */
  acceptSession: (session: Session) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const demoFlag = (await AsyncStorage.getItem(DEMO_KEY)) === '1';
      if (!alive) return;
      setDemo(demoFlag);

      if (!supabase) {
        setReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSession(data.session);
      // Sem esperar: na abertura o id do aparelho já é o certo, e travar o
      // splash numa ida à rede atrasa todo mundo por um caso que quase nunca
      // muda (fusão feita em outro aparelho).
      if (data.session?.access_token) void vincularConta(data.session.access_token);
      setReady(true);

      const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
        setSession(next);
        if (next?.access_token) {
          void vincularConta(next.access_token);
          void AsyncStorage.removeItem(DEMO_KEY);
          setDemo(false);
        }
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    })();

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(DEMO_KEY);
    setDemo(false);
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
  }, []);

  const enterDemo = useCallback(async () => {
    await AsyncStorage.setItem(DEMO_KEY, '1');
    setDemo(true);
  }, []);

  /**
   * Recém-logado: liga a conta ao cadastro que já existe no aparelho.
   *
   * O id que vale para o backend é o de `users.id`, NÃO o uid do Supabase — são
   * duas numerações diferentes. Aqui se esperava a resposta de propósito: a
   * próxima tela já consulta a semente do dia, e consultar com o id errado
   * mostraria uma tela Hoje vazia para quem acabou de entrar.
   */
  const acceptSession = useCallback(async (next: Session) => {
    setSession(next);
    if (next.access_token) await vincularConta(next.access_token);
    await AsyncStorage.removeItem(DEMO_KEY);
    setDemo(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session) || demo,
      configured: SUPABASE_CONFIGURED,
      signOut,
      enterDemo,
      acceptSession,
    }),
    [ready, session, demo, signOut, enterDemo, acceptSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
