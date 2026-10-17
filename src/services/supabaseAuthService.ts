import { supabase } from '../lib/supabase';
import { AuthService, NeedsVerificationError, User } from './authService';

/** Accounts stored in Supabase (auth.users + public.profiles). */

type ProfileRow = {
  id: string;
  name: string | null;
  placement_done: boolean | null;
  level: string | null;
  start_lesson_id: string | null;
};

function client() {
  if (!supabase) throw new Error('Supabase is not set up.');
  return supabase;
}

function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Wrong email or password.';
  if (m.includes('expired') || m.includes('invalid') && m.includes('otp')) return 'That code is wrong or has expired. Check the newest email, or tap “Send a new code”.';
  if (m.includes('token has expired or is invalid')) return 'That code is wrong or has expired. Check the newest email, or tap “Send a new code”.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists. Try logging in.';
  if (m.includes('network') || m.includes('fetch')) return 'Can’t reach the server. Check your internet connection.';
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a minute and try again.';
  return message;
}

async function loadProfile(userId: string, email: string, fallbackName: string): Promise<User> {
  const db = client();
  const { data, error } = await db.from('profiles').select('*').eq('id', userId).maybeSingle<ProfileRow>();
  if (error) throw new Error(friendly(error.message));
  let row = data;
  if (!row) {
    const { data: created, error: insertError } = await db
      .from('profiles')
      .upsert({ id: userId, name: fallbackName })
      .select()
      .single<ProfileRow>();
    if (insertError) throw new Error(friendly(insertError.message));
    row = created;
  }
  return {
    id: userId,
    email,
    name: row?.name || fallbackName || email.split('@')[0],
    placementDone: !!row?.placement_done,
    level: row?.level ?? null,
    startLessonId: row?.start_lesson_id ?? null,
  };
}

export const supabaseAuthService: AuthService = {
  async getCurrentUser() {
    const { data } = await client().auth.getSession();
    const u = data.session?.user;
    if (!u) return null;
    try {
      return await loadProfile(u.id, u.email ?? '', (u.user_metadata?.name as string) ?? '');
    } catch {
      return null;
    }
  },

  async signUp(name, email, password) {
    const { data, error } = await client().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) throw new Error(friendly(error.message));
    if (!data.session || !data.user) {
      throw new NeedsVerificationError(email.trim(), `We sent a confirmation code to ${email.trim()}.`);
    }
    return loadProfile(data.user.id, data.user.email ?? email, name.trim());
  },

  async logIn(email, password) {
    const { data, error } = await client().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        await client().auth.resend({ type: 'signup', email: email.trim() }).catch(() => {});
        throw new NeedsVerificationError(email.trim(), `Your email isn't confirmed yet. We sent a new code to ${email.trim()}.`);
      }
      throw new Error(friendly(error.message));
    }
    const u = data.user;
    return loadProfile(u.id, u.email ?? email, (u.user_metadata?.name as string) ?? '');
  },

  async logOut() {
    await client().auth.signOut();
  },

  async verifyEmail(email, code) {
    const { data, error } = await client().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    if (error) throw new Error(friendly(error.message));
    const u = data.user;
    if (!u || !data.session) throw new Error('Could not confirm your email. Please try again.');
    return loadProfile(u.id, u.email ?? email, (u.user_metadata?.name as string) ?? '');
  },

  async resendCode(email) {
    const { error } = await client().auth.resend({ type: 'signup', email: email.trim() });
    if (error) throw new Error(friendly(error.message));
  },

  async updateUser(user) {
    const { error } = await client()
      .from('profiles')
      .update({
        name: user.name,
        placement_done: user.placementDone,
        level: user.level,
        start_lesson_id: user.startLessonId,
      })
      .eq('id', user.id);
    if (error) throw new Error(friendly(error.message));
  },
};
