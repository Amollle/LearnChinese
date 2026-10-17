import { allWords, Lesson, Word } from '../data/lessons';
import { Sentence, sentences } from '../data/sentences';
import { shuffle } from '../utils';

export type ChoiceMode = 'listen' | 'en2zh' | 'zh2en' | 'tone';

export type Step =
  | { kind: 'intro'; word: Word }
  | { kind: 'choice'; mode: ChoiceMode; word: Word; options: string[]; answer: string; retry?: boolean }
  | { kind: 'match'; words: Word[]; retry?: boolean }
  | { kind: 'build'; word: Word; sentence: Sentence; tiles: string[]; retry?: boolean }
  | { kind: 'fill'; word: Word; sentence: Sentence; blank: number; options: string[]; answer: string; retry?: boolean };

const clean = (s: string) => s.replace(/[？?…。，!！]/g, '');

/** Pick distractor words, preferring ones from the same pool (harder), then any word. */
function distractors(word: Word, pool: Word[], count: number, key: (w: Word) => string): Word[] {
  const ok = (w: Word) => w.id !== word.id && key(w) !== key(word);
  const fromPool = shuffle(pool.filter(ok));
  const rest = shuffle(allWords.filter((w) => ok(w) && !fromPool.includes(w)));
  const picked: Word[] = [];
  const seen = new Set<string>([key(word)]);
  for (const w of [...fromPool, ...rest]) {
    if (seen.has(key(w))) continue;
    seen.add(key(w));
    picked.push(w);
    if (picked.length === count) break;
  }
  return picked;
}

const TONE_SETS = ['āáǎàa', 'ēéěèe', 'īíǐìi', 'ōóǒòo', 'ūúǔùu', 'ǖǘǚǜü'];

/** Make wrong-tone versions of a pinyin string, e.g. "nǐ hǎo" → "ní hào". */
export function toneVariants(pinyin: string, count = 3): string[] {
  const chars = [...pinyin];
  const marked: { i: number; set: string }[] = [];
  chars.forEach((c, i) => {
    const set = TONE_SETS.find((s) => s.slice(0, 4).includes(c));
    if (set) marked.push({ i, set });
  });
  if (marked.length === 0) return [];
  const results = new Set<string>();
  for (let attempt = 0; attempt < 60 && results.size < count; attempt++) {
    const next = [...chars];
    const changeCount = 1 + Math.floor(Math.random() * marked.length);
    for (const m of shuffle(marked).slice(0, changeCount)) {
      const current = m.set.indexOf(next[m.i]);
      let tone = Math.floor(Math.random() * 4);
      if (tone === current) tone = (tone + 1 + Math.floor(Math.random() * 3)) % 4;
      next[m.i] = m.set[tone];
    }
    const v = next.join('');
    if (v !== pinyin) results.add(v);
  }
  return [...results];
}

function choiceStep(word: Word, mode: ChoiceMode, pool: Word[]): Step {
  if (mode === 'tone') {
    const variants = toneVariants(word.pinyin);
    if (variants.length >= 2) {
      return { kind: 'choice', mode, word, options: shuffle([word.pinyin, ...variants]), answer: word.pinyin };
    }
    mode = 'zh2en';
  }
  if (mode === 'en2zh') {
    const opts = distractors(word, pool, 3, (w) => w.hanzi).map((w) => w.hanzi);
    return { kind: 'choice', mode, word, options: shuffle([word.hanzi, ...opts]), answer: word.hanzi };
  }
  const opts = distractors(word, pool, 3, (w) => w.english).map((w) => w.english);
  return { kind: 'choice', mode, word, options: shuffle([word.english, ...opts]), answer: word.english };
}

function sentenceStep(word: Word, pool: Word[], preferFill: boolean): Step | null {
  const sentence = sentences[word.hanzi];
  if (!sentence) return null;
  const tokens = sentence.tokens.map((t) => t.zh);
  const blank = tokens.indexOf(clean(word.hanzi));
  if (preferFill && blank >= 0) {
    const opts = distractors(word, pool, 3, (w) => w.hanzi)
      .map((w) => clean(w.hanzi))
      .filter((h) => h !== tokens[blank]);
    return { kind: 'fill', word, sentence, blank, options: shuffle([tokens[blank], ...opts.slice(0, 3)]), answer: tokens[blank] };
  }
  if (tokens.length < 2) return null;
  // one or two extra "decoy" tiles from other sentences
  const decoys = shuffle(
    Object.values(sentences)
      .flatMap((s) => s.tokens.map((t) => t.zh))
      .filter((t) => !tokens.includes(t)),
  ).slice(0, tokens.length >= 4 ? 2 : 1);
  return { kind: 'build', word, sentence, tiles: shuffle([...tokens, ...decoys]) };
}

/**
 * A full guided lesson:
 * for each small group of words → meet each word → quick practice → match pairs;
 * then use every word in a sentence (build it from tiles, or fill in the blank).
 */
export function buildLessonSteps(lesson: Lesson): Step[] {
  const words = lesson.words;
  const steps: Step[] = [];
  const groups: Word[][] = [];
  for (let i = 0; i < words.length; i += 3) groups.push(words.slice(i, i + 3));
  // fold a tiny last group into the previous one
  if (groups.length > 1 && groups[groups.length - 1].length === 1) {
    groups[groups.length - 2].push(...groups.pop()!);
  }

  const modes: ChoiceMode[] = ['listen', 'en2zh', 'tone', 'zh2en'];
  let m = 0;
  groups.forEach((group, gi) => {
    group.forEach((w) => steps.push({ kind: 'intro', word: w }));
    shuffle(group).forEach((w) => steps.push(choiceStep(w, modes[m++ % modes.length], words)));
    const matchWords = [...group];
    if (matchWords.length < 4 && gi > 0) matchWords.push(...shuffle(groups.slice(0, gi).flat()).slice(0, 4 - matchWords.length));
    if (matchWords.length >= 3) steps.push({ kind: 'match', words: matchWords });
  });

  shuffle(words).forEach((w, i) => {
    const s = sentenceStep(w, words, i % 2 === 1);
    if (s) steps.push(s);
  });
  return steps;
}

/** A review session for words that are due: mixed practice, no introductions. */
export function buildReviewSteps(words: Word[], limit = 10): Step[] {
  const picked = shuffle(words).slice(0, limit);
  const modes: ChoiceMode[] = ['listen', 'en2zh', 'tone', 'zh2en'];
  const steps: Step[] = [];
  picked.forEach((w, i) => {
    steps.push(choiceStep(w, modes[i % modes.length], allWords));
    if (i % 2 === 0) {
      const s = sentenceStep(w, allWords, i % 4 === 0);
      if (s) steps.push(s);
    }
  });
  if (picked.length >= 4) steps.push({ kind: 'match', words: shuffle(picked).slice(0, 4) });
  return shuffle(steps);
}

/** Which word(s) a step practises — used to record spaced-repetition results. */
export function stepWords(step: Step): Word[] {
  if (step.kind === 'match') return step.words;
  return [step.word];
}
