import { Lesson, lessons, levels, Word } from '../data/lessons';
import { sentencesOf, Story, StoryToken } from '../data/stories';
import type { Progress } from '../services/progressStore';

const clean = (s: string) => s.replace(/[…？?！!。，,\s]/g, '');
const isWord = (t: StoryToken) => !!t.py;

const byHanzi = new Map<string, { lesson: Lesson; word: Word }>();
for (const lesson of lessons) for (const word of lesson.words) byHanzi.set(clean(word.hanzi), { lesson, word });

export type LessonHint =
  | { kind: 'word'; lesson: Lesson; word: Word }
  | { kind: 'char'; lesson: Lesson; word: Word; char: string }
  | { kind: 'none' };

/** Which lesson teaches this word (or, failing that, one of its characters). */
export function lessonFor(zh: string): LessonHint {
  const exact = byHanzi.get(zh);
  if (exact) return { kind: 'word', ...exact };
  for (const ch of zh) {
    for (const lesson of lessons) {
      const word = lesson.words.find((w) => clean(w.hanzi).includes(ch));
      if (word) return { kind: 'char', lesson, word, char: ch };
    }
  }
  return { kind: 'none' };
}

/** The Chinese of every word the learner has learned. */
export function learnedHanzi(progress: Progress): string[] {
  const ids = new Set(progress.learned);
  return lessons.flatMap((l) => l.words).filter((w) => ids.has(w.id)).map((w) => clean(w.hanzi));
}

/** Does the learner know this word? (a learned word, or every character appears in learned words) */
export function knowsToken(zh: string, learned: string[]) {
  if (learned.includes(zh)) return true;
  return [...zh].every((ch) => learned.some((w) => w.includes(ch)));
}

/** Share of the story's different words the learner already knows (0–1). */
export function storyCoverage(story: Story, learned: string[]) {
  const words = [...new Set(sentencesOf(story).flatMap((s) => s.t.filter(isWord).map((t) => t.zh)))];
  if (!words.length) return 0;
  return words.filter((w) => knowsToken(w, learned)).length / words.length;
}

/** A good story level for the learner: one above the last lesson level they've completed. */
export function recommendedLevel(progress: Progress) {
  let done = 0;
  for (const level of levels) {
    if (level.lessonIds.every((id) => progress.completedLessons.includes(id))) done = level.id;
    else break;
  }
  return Math.min(levels.length, done + 1);
}

export function fitLabel(story: Story, rec: number) {
  if (story.level === rec) return { text: '⭐ Good for you', tone: 'good' as const };
  if (story.level < rec) return { text: 'Easy', tone: 'easy' as const };
  return { text: 'Challenge', tone: 'hard' as const };
}

/** The story to suggest on Home: an unread one at the learner's level, else any unread one. */
export function storyForYou(all: Story[], progress: Progress) {
  const rec = recommendedLevel(progress);
  const read = progress.storiesRead ?? [];
  return all.find((s) => s.level === rec && !read.includes(s.id)) ?? all.find((s) => !read.includes(s.id)) ?? all.find((s) => s.level === rec);
}

export const levelName = (n: number) => levels.find((l) => l.id === n)?.name ?? '';
