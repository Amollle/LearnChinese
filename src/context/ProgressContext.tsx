import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseConfigured } from '../lib/supabase';
import { emptyProgress, localProgressStore, Progress, ProgressStore } from '../services/progressStore';
import { supabaseProgressStore } from '../services/supabaseProgressStore';
import { current as currentPet, PetState } from '../pet/petLogic';

// Use Supabase (with an offline copy on the phone) when configured, otherwise phone only.
const store: ProgressStore = supabaseConfigured ? supabaseProgressStore : localProgressStore;

export const DAILY_GOAL_XP = 50; // default
export const MIN_DAILY_GOAL = 10;
export const MAX_DAILY_GOAL = 500;

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey() {
  return dateKey(new Date());
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

/** Days until the next review, by box. Each correct answer moves a word up a box. */
const REVIEW_INTERVALS = [0, 1, 2, 4, 7, 15, 30];

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

/** Adjust daily numbers when the app is opened on a new day. */
function normalize(p: Progress): Progress {
  const today = todayKey();
  if (p.lastActiveDate === today) return p;
  const streakAlive = p.lastActiveDate === yesterdayKey();
  return { ...p, xpToday: 0, streak: streakAlive ? p.streak : 0 };
}

/** Register activity today: updates streak and daily XP. */
function touch(p: Progress, xp: number): Progress {
  const today = todayKey();
  if (p.lastActiveDate === today) {
    return { ...p, xp: p.xp + xp, xpToday: p.xpToday + xp };
  }
  const streak = p.lastActiveDate === yesterdayKey() ? p.streak + 1 : 1;
  return { ...p, xp: p.xp + xp, xpToday: xp, streak, lastActiveDate: today };
}

type ProgressContextValue = {
  progress: Progress;
  ready: boolean;
  isLearned: (wordId: string) => boolean;
  markLearned: (wordId: string) => void;
  addXp: (amount: number) => void;
  recordQuiz: (percent: number) => void;
  recordAnswer: (wordId: string, correct: boolean) => void;
  completeLesson: (lessonId: string, wordIds: string[], xp: number) => void;
  dueWordIds: string[];
  placeOut: (lessons: { id: string; wordIds: string[] }[]) => void;
  dailyGoal: number;
  setDailyGoal: (xp: number) => void;
  /** Change the virtual pet (gets the pet as it is right now, after time has passed). */
  updatePet: (fn: (pet: PetState | undefined) => PetState | undefined) => void;
  resetAll: () => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadedFor.current = null;
    setReady(false);
    store.load(userId).then((p) => {
      if (cancelled) return;
      setProgress(normalize(p));
      loadedFor.current = userId;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (loadedFor.current === userId) store.save(userId, progress);
  }, [progress, userId]);

  const isLearned = useCallback((id: string) => progress.learned.includes(id), [progress.learned]);

  const markLearned = useCallback((id: string) => {
    setProgress((p) => {
      if (p.learned.includes(id)) return p;
      return touch({ ...p, learned: [...p.learned, id] }, 5);
    });
  }, []);

  const addXp = useCallback((amount: number) => {
    setProgress((p) => touch(p, amount));
  }, []);

  const recordQuiz = useCallback((percent: number) => {
    setProgress((p) => ({ ...p, bestQuizScore: Math.max(p.bestQuizScore, percent) }));
  }, []);

  const recordAnswer = useCallback((wordId: string, correct: boolean) => {
    setProgress((p) => {
      const current = p.srs[wordId] ?? { box: 0, due: todayKey() };
      const box = correct ? Math.min(current.box + 1, REVIEW_INTERVALS.length - 1) : 0;
      return { ...p, srs: { ...p.srs, [wordId]: { box, due: addDays(REVIEW_INTERVALS[box]) } } };
    });
  }, []);

  const completeLesson = useCallback((lessonId: string, wordIds: string[], xp: number) => {
    setProgress((p) => {
      const learned = Array.from(new Set([...p.learned, ...wordIds]));
      const srs = { ...p.srs };
      for (const id of wordIds) {
        if (!srs[id] || srs[id].box === 0) srs[id] = { box: 1, due: addDays(REVIEW_INTERVALS[1]) };
      }
      const completedLessons = p.completedLessons.includes(lessonId) ? p.completedLessons : [...p.completedLessons, lessonId];
      return touch({ ...p, learned, srs, completedLessons }, xp);
    });
  }, []);

  /** Mark lessons as skipped by the placement test: words count as learned and go into review. */
  const placeOut = useCallback((placed: { id: string; wordIds: string[] }[]) => {
    setProgress((p) => {
      const ids = placed.flatMap((l) => l.wordIds);
      const learned = Array.from(new Set([...p.learned, ...ids]));
      const srs = { ...p.srs };
      for (const id of ids) if (!srs[id]) srs[id] = { box: 2, due: addDays(REVIEW_INTERVALS[1]) };
      const lessonIds = placed.map((l) => l.id);
      return {
        ...p,
        learned,
        srs,
        completedLessons: Array.from(new Set([...p.completedLessons, ...lessonIds])),
        placedOut: Array.from(new Set([...(p.placedOut ?? []), ...lessonIds])),
      };
    });
  }, []);

  const dailyGoal = progress.dailyGoal ?? DAILY_GOAL_XP;
  const setDailyGoal = useCallback((xp: number) => {
    const goal = Math.max(MIN_DAILY_GOAL, Math.min(MAX_DAILY_GOAL, Math.round(xp)));
    setProgress((p) => ({ ...p, dailyGoal: goal }));
  }, []);

  const updatePet = useCallback((fn: (pet: PetState | undefined) => PetState | undefined) => {
    setProgress((p) => {
      const next = fn(p.pet ? currentPet(p.pet) : undefined);
      return next === undefined && p.pet === undefined ? p : { ...p, pet: next };
    });
  }, []);

  const today = todayKey();
  const dueWordIds = useMemo(
    () => progress.learned.filter((id) => (progress.srs[id]?.due ?? today) <= today),
    [progress.learned, progress.srs, today],
  );

  const resetAll = useCallback(() => {
    store.reset(userId);
    // keep the learner's chosen daily goal and their panda when progress is reset
    setProgress((p) => ({ ...emptyProgress, dailyGoal: p.dailyGoal, pet: p.pet }));
  }, [userId]);

  return (
    <ProgressContext.Provider value={{ progress, ready, isLearned, markLearned, addXp, recordQuiz, recordAnswer, completeLesson, dueWordIds, placeOut, dailyGoal, setDailyGoal, updatePet, resetAll }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}
