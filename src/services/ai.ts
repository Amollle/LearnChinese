import { supabase, supabaseConfigured } from '../lib/supabase';
import type { WeekStats } from './weekStats';

/**
 * Talks to the `talk` function running on Supabase, which is what actually
 * calls Claude. The API key lives there, never in the app.
 *
 * Free talk needs the internet and a signed-in account. When it isn't set up,
 * `aiConfigured` is false and the Talk tab only offers the scripted
 * conversations, which work offline exactly as before.
 */
export const aiConfigured = supabaseConfigured;

export type AiLine = { zh: string; py: string; en: string };
export type ChatLine = { role: 'partner' | 'me'; zh: string };

export type TurnResult = {
  partner: AiLine;
  /** What the AI thinks the learner meant, so they can correct it. */
  understood: string | null;
  /** A gentle correction of the learner's Chinese, when it needed one. */
  note: string | null;
  suggestions: AiLine[];
  ended: boolean;
};

export type CoachPhrase = AiLine & { why?: string };

export type Coaching = {
  summary: string;
  didWell: string[];
  workOn: string[];
  phrases: CoachPhrase[];
};

/** The coach's written week in review. The numbers stay in the app; this is the words. */
export type WrittenReport = {
  headline: string;
  summary: string;
  wins: string[];
  focus: string[];
  tip: string;
  practice: CoachPhrase[];
};

/** One of the learner's words, as offered to the coach when it builds a quiz. */
export type QuizCandidate = { id: string; zh: string; py: string; en: string; box: number };

/**
 * The coach's quiz, as ids only. Nothing here is shown to the learner as it
 * stands — the app looks every id up in its own word list first — so the AI
 * cannot put wrong Chinese in front of them.
 */
export type QuizPlan = {
  note: string;
  questions: { id: string; kind: string; distractors: string[]; why?: string }[];
};

/** Thrown for anything the learner might be able to fix (offline, signed out). */
export class AiUnavailable extends Error {}

/** The friendly message the server sent, if it sent one. */
function messageIn(body: string): string | null {
  try {
    const parsed = JSON.parse(body);
    return typeof parsed.error === 'string' ? parsed.error : null;
  } catch {
    return null;
  }
}

const TIMEOUT_MS = 30000;

async function call<T>(payload: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new AiUnavailable('Free talk isn’t set up on this app yet.');

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AiUnavailable('Please log in again to use free talk.');

  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/functions/v1/talk`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abort.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (res.status === 401 || res.status === 403) throw new AiUnavailable('Please log in again to use free talk.');
      if (res.status === 429) {
        // the free AI tier has a daily cap — the server words this for us
        throw new AiUnavailable(messageIn(text) ?? 'Free talk has had a lot of use today. Please try again later.');
      }
      throw new Error(`Server error ${res.status}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof AiUnavailable) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new AiUnavailable('That took too long. Check your internet and try again.');
    }
    if (e instanceof TypeError) {
      // fetch throws a TypeError when the phone can't reach the network at all
      throw new AiUnavailable('No internet — free talk needs a connection.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** The partner's next line. Omit `said` for the opening greeting. */
export function takeTurn(args: {
  situation: string;
  known: string[];
  history: ChatLine[];
  said?: string;
}): Promise<TurnResult> {
  return call<TurnResult>({ action: 'turn', ...args });
}

/** A written report on the learner's week, from numbers the app worked out. */
export function getWeeklyReport(args: { stats: WeekStats; known: string[] }): Promise<WrittenReport> {
  return call<WrittenReport>({ action: 'report', ...args });
}

/** A quiz aimed at the words the learner keeps getting wrong. */
export function getCustomQuiz(args: { candidates: QuizCandidate[]; count: number }): Promise<QuizPlan> {
  return call<QuizPlan>({ action: 'quiz', ...args });
}

/** The coach's thoughts once the conversation is over. */
export function getCoaching(args: {
  situation: string;
  known: string[];
  history: ChatLine[];
}): Promise<Coaching> {
  return call<Coaching>({ action: 'coach', ...args });
}
