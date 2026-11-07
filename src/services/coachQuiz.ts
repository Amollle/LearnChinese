import { allWords, Word } from '../data/lessons';
import type { QuizCandidate, QuizPlan } from './ai';
import type { Progress } from './progressStore';

/**
 * Picking the words for a made-for-you quiz, and checking what the coach
 * sends back.
 *
 * The coach only ever chooses *which* words to test and which wrong answers
 * to put beside them — it returns ids, never Chinese. Every id is looked up
 * in the app's own word list here, and anything unrecognised is thrown away,
 * so a confident mistake by the AI cannot be marked as the right answer.
 *
 * Nothing in this file talks to the network, so it can be tested on its own.
 */

export type QuizKind = 'en2zh' | 'zh2en' | 'listen';
export type CoachQuestion = { kind: QuizKind; word: Word; options: Word[]; why?: string };

const KINDS: QuizKind[] = ['en2zh', 'zh2en', 'listen'];
/** Keep the prompt a sensible size when the learner knows a lot of words. */
const MAX_CANDIDATES = 90;
/** How many words are needed before a made-for-you quiz is worth offering. */
export const MIN_WORDS_FOR_COACH_QUIZ = 4;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A wrong answer has to be genuinely wrong, not a second way of saying the same thing. */
function usableAs(distractor: Word, answer: Word) {
  return distractor.id !== answer.id && distractor.hanzi !== answer.hanzi && distractor.english !== answer.english;
}

/** The learner's words, shakiest first, for the coach to choose from. */
export function quizCandidates(progress: Progress, max = MAX_CANDIDATES): QuizCandidate[] {
  const byId = new Map(allWords.map((w) => [w.id, w]));
  const learned = progress.learned.map((id) => byId.get(id)).filter((w): w is Word => !!w);
  const box = (w: Word) => progress.srs[w.id]?.box ?? 0;
  return learned
    .sort((a, b) => box(a) - box(b))
    .slice(0, max)
    .map((w) => ({ id: w.id, zh: w.hanzi, py: w.pinyin, en: w.english, box: box(w) }));
}

/**
 * Turns the coach's plan into real questions, dropping anything it made up.
 * `pool` is what was offered to it; only those words may be tested.
 */
export function resolvePlan(
  plan: QuizPlan,
  pool: QuizCandidate[],
  words: Word[] = allWords,
): { questions: CoachQuestion[]; note: string } {
  const byId = new Map(words.map((w) => [w.id, w]));
  const allowed = new Set(pool.map((c) => c.id));
  const used = new Set<string>();
  const questions: CoachQuestion[] = [];
  const planned = Array.isArray(plan?.questions) ? plan.questions : [];

  planned.forEach((q, i) => {
    const word = byId.get(String(q?.id));
    // anything the coach invented, or asked for twice, is dropped
    if (!word || !allowed.has(word.id) || used.has(word.id)) return;
    used.add(word.id);

    const seen = new Set<string>();
    const picked: Word[] = [];
    for (const id of Array.isArray(q.distractors) ? q.distractors : []) {
      if (picked.length === 3) break;
      const d = byId.get(String(id));
      if (d && usableAs(d, word) && !seen.has(d.id)) {
        seen.add(d.id);
        picked.push(d);
      }
    }
    // top up from the whole word list if the coach gave too few usable ones
    if (picked.length < 3) {
      for (const d of shuffle(words)) {
        if (picked.length === 3) break;
        if (usableAs(d, word) && !seen.has(d.id)) {
          seen.add(d.id);
          picked.push(d);
        }
      }
    }

    const kind = KINDS.includes(q.kind as QuizKind) ? (q.kind as QuizKind) : KINDS[i % KINDS.length];
    const why = typeof q.why === 'string' && q.why.trim() ? q.why.trim() : undefined;
    questions.push({ kind, word, options: shuffle([word, ...picked]), why });
  });

  return { questions, note: typeof plan?.note === 'string' ? plan.note : '' };
}
