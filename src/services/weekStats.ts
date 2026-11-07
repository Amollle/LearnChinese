import type { Word } from '../data/lessons';
import type { Progress } from './progressStore';

/**
 * Turns the saved progress into the handful of numbers the weekly report
 * talks about. No AI here — this is just counting, so the report screen can
 * show the figures even when the AI write-up is unavailable.
 */

export type ReportWord = { zh: string; py: string; en: string };

/** One bar of the little seven-day chart. */
export type DayBar = { date: string; letter: string; xp: number; today: boolean };

export type WeekStats = {
  /** Days in the last seven on which anything was earned. */
  daysActive: number;
  xpThisWeek: number;
  xpLastWeek: number;
  newWordsThisWeek: number;
  /** Review and quiz answers given in the last seven days. */
  answered: number;
  /** Percent correct over those answers, or null when none were given. */
  accuracy: number | null;
  streak: number;
  wordsKnown: number;
  totalWords: number;
  /** Words sitting in the top review boxes — these have really stuck. */
  solidCount: number;
  /** Words that keep falling back to the start. */
  shakyCount: number;
  dueNow: number;
  shaky: ReportWord[];
  solid: ReportWord[];
  lessonsDone: number;
  storiesRead: number;
  charactersWritten: number;
  /** XP for each of the last seven days, oldest first, for the little chart. */
  dailyXp: DayBar[];
  /** False on the first few days, when there is no log to compare against. */
  hasHistory: boolean;
};

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** The last `count` dates ending today, oldest first. */
function window(count: number, endingDaysAgo = 0): string[] {
  const out: string[] = [];
  for (let i = count - 1 + endingDaysAgo; i >= endingDaysAgo; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(dateKey(d));
  }
  return out;
}

const brief = (w: Word): ReportWord => ({ zh: w.hanzi, py: w.pinyin, en: w.english });

export function weekStats(progress: Progress, allWords: Word[]): WeekStats {
  const days = progress.days ?? {};
  const thisWeek = window(7);
  const lastWeek = window(7, 7);
  const today = dateKey(new Date());

  let xpThisWeek = 0;
  let newWordsThisWeek = 0;
  let correct = 0;
  let wrong = 0;
  let daysActive = 0;
  for (const d of thisWeek) {
    const log = days[d];
    if (!log) continue;
    xpThisWeek += log.xp;
    newWordsThisWeek += log.learned;
    correct += log.correct;
    wrong += log.wrong;
    if (log.xp > 0 || log.correct > 0 || log.wrong > 0) daysActive++;
  }

  let xpLastWeek = 0;
  for (const d of lastWeek) xpLastWeek += days[d]?.xp ?? 0;

  const byId = new Map(allWords.map((w) => [w.id, w]));
  const learned = progress.learned.map((id) => byId.get(id)).filter((w): w is Word => !!w);

  const boxOf = (w: Word) => progress.srs[w.id]?.box ?? 0;
  const shaky = learned
    .filter((w) => boxOf(w) <= 1)
    .sort((a, b) => boxOf(a) - boxOf(b))
    .slice(0, 12);
  const solidWords = learned.filter((w) => boxOf(w) >= 5);

  const answered = correct + wrong;

  const dailyXp: DayBar[] = thisWeek.map((d) => {
    // the key is YYYY-MM-DD; read it back as a local date, not a UTC one
    const [y, m, day] = d.split('-').map(Number);
    return {
      date: d,
      letter: WEEKDAY[new Date(y, m - 1, day).getDay()],
      xp: days[d]?.xp ?? 0,
      today: d === today,
    };
  });

  return {
    daysActive,
    dailyXp,
    xpThisWeek,
    xpLastWeek,
    newWordsThisWeek,
    answered,
    accuracy: answered > 0 ? Math.round((correct / answered) * 100) : null,
    streak: progress.streak,
    wordsKnown: learned.length,
    totalWords: allWords.length,
    solidCount: solidWords.length,
    shakyCount: learned.filter((w) => boxOf(w) <= 1).length,
    dueNow: learned.filter((w) => (progress.srs[w.id]?.due ?? today) <= today).length,
    shaky: shaky.map(brief),
    solid: solidWords.slice(0, 6).map(brief),
    lessonsDone: progress.completedLessons.length,
    storiesRead: (progress.storiesRead ?? []).length,
    charactersWritten: (progress.written ?? []).length,
    hasHistory: thisWeek.some((d) => !!days[d]) || lastWeek.some((d) => !!days[d]),
  };
}

/** Whether a fresh report is worth asking for: none yet, or the saved one is a week old. */
export function reportIsStale(progress: Progress): boolean {
  const made = progress.weeklyReport?.madeOn;
  if (!made) return true;
  const weekAgo = window(1, 7)[0];
  return made <= weekAgo;
}
