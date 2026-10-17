import { allWords, Lesson, levels, Word } from '../data/lessons';
import { sentences } from '../data/sentences';
import { shuffle } from '../utils';

/** Placement test questions: 3 per lesson, harder question types at higher levels. */
export type QKind = 'zh2en' | 'en2zh' | 'listen' | 'fill';
export type Question = {
  lessonIndex: number;
  kind: QKind;
  word: Word;
  prompt: string;
  options: string[];
  answer: string;
  fillSentence?: string;
  fillEnglish?: string;
};

export const PASS_PER_LESSON = 2;

const clean = (s: string) => s.replace(/[？?…。，!！]/g, '');

function pickOptions(word: Word, key: (w: Word) => string, pool: Word[]) {
  const seen = new Set([key(word)]);
  const out: string[] = [];
  for (const w of [...shuffle(pool), ...shuffle(allWords)]) {  // same-lesson words first: harder to guess
    const k = key(w);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length === 3) break;
  }
  return shuffle([key(word), ...out]);
}

export function questionsForLesson(lesson: Lesson, lessonIndex: number): Question[] {
  const levelId = levels.find((l) => l.lessonIds.includes(lesson.id))?.id ?? 1;
  // harder question types for higher levels
  const kinds: QKind[] = levelId === 1 ? ['zh2en', 'listen', 'en2zh'] : levelId === 2 ? ['en2zh', 'listen', 'fill'] : ['fill', 'en2zh', 'fill'];
  const words = shuffle(lesson.words);
  const used = new Set<string>();
  return kinds.map((kind) => {
    let word = words.find((w) => !used.has(w.id)) ?? words[0];
    if (kind === 'fill') {
      // use a word whose sentence contains it as a separate word
      const candidate = words.find((w) => {
        const s = sentences[w.hanzi];
        return !used.has(w.id) && s && s.tokens.some((t) => t.zh === clean(w.hanzi));
      });
      if (candidate) word = candidate;
      else kind = 'en2zh';
    }
    used.add(word.id);
    if (kind === 'fill') {
      const s = sentences[word.hanzi];
      const target = clean(word.hanzi);
      const blanked = s.tokens.map((t) => (t.zh === target ? '＿＿' : t.zh)).join('');
      return {
        lessonIndex,
        kind,
        word,
        prompt: 'Fill in the missing word',
        options: pickOptions(word, (w) => clean(w.hanzi), lesson.words),
        answer: target,
        fillSentence: blanked,
        fillEnglish: s.en,
      };
    }
    if (kind === 'en2zh') {
      return { lessonIndex, kind, word, prompt: `Which one means “${word.english}”?`, options: pickOptions(word, (w) => w.hanzi, lesson.words), answer: word.hanzi };
    }
    return {
      lessonIndex,
      kind,
      word,
      prompt: kind === 'listen' ? 'Listen. What does it mean?' : 'What does this mean?',
      options: pickOptions(word, (w) => w.english, lesson.words),
      answer: word.english,
    };
  });
}

