import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabaseConfigured } from '../lib/supabase';
import { AuthService, localAuthService, User } from '../services/authService';
import { supabaseAuthService } from '../services/supabaseAuthService';

// Use Supabase when it's configured in .env, otherwise keep accounts on the phone.
const auth: AuthService = supabaseConfigured ? supabaseAuthService : localAuthService;

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  completePlacement: (level: string, startLessonId: string) => Promise<void>;
  retakePlacement: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    auth
      .getCurrentUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setUser(await auth.signUp(name, email, password));
  }, []);

  const logIn = useCallback(async (email: string, password: string) => {
    setUser(await auth.logIn(email, password));
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    setUser(await auth.verifyEmail(email, code));
  }, []);

  const resendCode = useCallback((email: string) => auth.resendCode(email), []);

  const logOut = useCallback(async () => {
    await auth.logOut();
    setUser(null);
  }, []);

  const update = useCallback(
    async (changes: Partial<User>) => {
      if (!user) return;
      const next = { ...user, ...changes };
      setUser(next);
      try {
        await auth.updateUser(next);
      } catch {
        // keep going offline; it will be saved next time
      }
    },
    [user],
  );

  const completePlacement = useCallback(
    (level: string, startLessonId: string) => update({ placementDone: true, level, startLessonId }),
    [update],
  );

  const retakePlacement = useCallback(() => update({ placementDone: false }), [update]);

  return (
    <AuthContext.Provider value={{ user, ready, signUp, logIn, logOut, verifyEmail, resendCode, completePlacement, retakePlacement }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
