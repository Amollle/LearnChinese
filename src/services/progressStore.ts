import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PetState } from '../pet/petLogic';

/**
 * Where the learner's progress is saved.
 *
 * Right now everything is stored on the phone (AsyncStorage).
 * When the backend/database is added later, create another object that
 * implements `ProgressStore` (e.g. `apiProgressStore`) and swap it in
 * `ProgressContext.tsx` — no screens need to change.
 */
/** A word or phrase the AI coach picked out after a free-talk conversation. */
export type CoachWord = {
  zh: string;
  py: string;
  en: string;
  /** The coach's one-line reason it is worth practicing. */
  why?: string;
  /** When it was added (ms), so the newest come first. */
  addedAt: number;
};

/** One day's activity, so the weekly report can talk about trends. */
export type DayLog = {
  /** XP earned that day. */
  xp: number;
  /** Words met for the first time that day. */
  learned: number;
  /** Review/quiz answers that were right. */
  correct: number;
  /** Review/quiz answers that were wrong. */
  wrong: number;
};

/** The AI coach's written report on a week of learning. */
export type WeeklyReport = {
  headline: string;
  summary: string;
  wins: string[];
  focus: string[];
  tip: string;
  practice: { zh: string; py: string; en: string; why?: string }[];
  /** The day it was written (YYYY-MM-DD), so it is only rewritten once a week. */
  madeOn: string;
};

export type Progress = {
  learned: string[];
  xp: number;
  xpToday: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  streak: number;
  bestQuizScore: number; // percent
  /** Spaced repetition: per word, a "box" (how well it's known) and the date it's next due for review. */
  srs: Record<string, { box: number; due: string }>;
  completedLessons: string[];
  /** Lessons skipped by the placement test. */
  placedOut: string[];
  /** How much XP the learner wants to earn each day. */
  dailyGoal?: number;
  /** The virtual panda (missing until the learner adopts it). */
  pet?: PetState;
  /** Characters the learner has written from memory. */
  written?: string[];
  /** Stories the learner has finished. */
  storiesRead?: string[];
  /** Words the AI coach saved to review after a free-talk conversation. */
  coachWords?: CoachWord[];
  /** The last sixty days of activity, keyed by date, for the weekly report. */
  days?: Record<string, DayLog>;
  /** The most recent weekly report, kept so it is not rewritten on every visit. */
  weeklyReport?: WeeklyReport;
  /** When this copy was last saved (used to pick the newest copy between phone and cloud). */
  savedAt?: number;
};

export const emptyProgress: Progress = {
  learned: [],
  xp: 0,
  xpToday: 0,
  lastActiveDate: null,
  streak: 0,
  bestQuizScore: 0,
  srs: {},
  completedLessons: [],
  placedOut: [],
};

export interface ProgressStore {
  load(userId: string): Promise<Progress>;
  save(userId: string, progress: Progress): Promise<void>;
  reset(userId: string): Promise<void>;
}

const key = (userId: string) => `learnchinese.progress.v1.${userId}`;

export const localProgressStore: ProgressStore = {
  async load(userId) {
    try {
      const raw = await AsyncStorage.getItem(key(userId));
      return raw ? { ...emptyProgress, ...JSON.parse(raw) } : emptyProgress;
    } catch {
      return emptyProgress;
    }
  },
  async save(userId, progress) {
    try {
      await AsyncStorage.setItem(key(userId), JSON.stringify(progress));
    } catch {
      // ignore — progress just won't persist this time
    }
  },
  async reset(userId) {
    try {
      await AsyncStorage.removeItem(key(userId));
    } catch {
      // ignore
    }
  },
};
