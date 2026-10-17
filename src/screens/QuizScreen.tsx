import React, { useEffect, useState } from 'react';
import PetBuddy, { petReact } from '../pet/PetBuddy';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ProgressBar, SpeakButton, speakChinese } from '../components/ui';
import { useProgress } from '../context/ProgressContext';
import { allWords, lessons, Word } from '../data/lessons';
import { colors, radius } from '../theme';

type Kind = 'en2zh' | 'zh2en' | 'listen';
type Question = { kind: Kind; word: Word; options: Word[] };

const QUIZ_LENGTH = 10;
const XP_PER_CORRECT = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuiz(pool: Word[]): Question[] {
  const kinds: Kind[] = ['en2zh', 'zh2en', 'listen'];
  const picked = shuffle(pool).slice(0, Math.min(QUIZ_LENGTH, pool.length));
  return picked.map((word, i) => {
    const distractors = shuffle(
      allWords.filter((w) => w.id !== word.id && w.hanzi !== word.hanzi && w.english !== word.english),
    ).slice(0, 3);
    return { kind: kinds[i % kinds.length], word, options: shuffle([word, ...distractors]) };
  });
}

type Phase = { name: 'setup' } | { name: 'play'; questions: Question[] } | { name: 'results'; score: number; total: number };

export default function QuizScreen({ presetLessonId, onPresetUsed }: { presetLessonId?: string | null; onPresetUsed?: () => void }) {
  const [phase, setPhase] = useState<Phase>({ name: 'setup' });

  const start = (lessonId: string | null) => {
    const pool = lessonId ? lessons.find((l) => l.id === lessonId)?.words ?? allWords : allWords;
    setPhase({ name: 'play', questions: buildQuiz(pool) });
  };

  useEffect(() => {
    if (presetLessonId) {
      start(presetLessonId);
      onPresetUsed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetLessonId]);

  if (phase.name === 'play') {
    return (
      <QuizPlay
        questions={phase.questions}
        onFinish={(score) => setPhase({ name: 'results', score, total: phase.questions.length })}
        onQuit={() => setPhase({ name: 'setup' })}
      />
    );
  }

  if (phase.name === 'results') {
    const pct = Math.round((phase.score / phase.total) * 100);
    const msg = pct === 100 ? 'Perfect! 太棒了!' : pct >= 70 ? 'Great job! 很好!' : 'Keep practicing! 加油!';
    return (
      <View style={styles.center}>
        <Text style={styles.bigEmoji}>{pct >= 70 ? '🏆' : '💪'}</Text>
        <Text style={styles.resultTitle}>{msg}</Text>
        <Text style={styles.resultScore}>
          {phase.score} / {phase.total} correct
        </Text>
        <Text style={styles.resultXp}>+{phase.score * XP_PER_CORRECT} XP</Text>
        <Button title="New quiz" onPress={() => setPhase({ name: 'setup' })} style={styles.wide} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Quiz</Text>
        <PetBuddy size={56} />
      </View>
      <Text style={styles.subtitle}>
        {QUIZ_LENGTH} questions mixing reading, meaning and listening. Earn {XP_PER_CORRECT} XP for each right answer.
      </Text>

      <Pressable onPress={() => start(null)}>
        <Card style={[styles.option, styles.featured]}>
          <Text style={styles.optionEmoji}>🎲</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: '#fff' }]}>Mixed quiz</Text>
            <Text style={[styles.optionSub, { color: '#FFE9E6' }]}>Words from every lesson</Text>
          </View>
        </Card>
      </Pressable>

      <Text style={styles.section}>Or pick a lesson</Text>
      {lessons.map((l) => (
        <Pressable key={l.id} onPress={() => start(l.id)}>
          <Card style={styles.option}>
            <Text style={styles.optionEmoji}>{l.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>{l.title}</Text>
              <Text style={styles.optionSub}>{l.chineseTitle}</Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function QuizPlay({
  questions,
  onFinish,
  onQuit,
}: {
  questions: Question[];
  onFinish: (score: number) => void;
  onQuit: () => void;
}) {
  const { addXp, recordQuiz } = useProgress();
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const q = questions[i];

  useEffect(() => {
    if (q.kind === 'listen') speakChinese(q.word.hanzi);
  }, [q]);

  const choose = (w: Word) => {
    if (chosen) return;
    setChosen(w.id);
    petReact(w.id === q.word.id ? 'right' : 'wrong');
    if (w.id === q.word.id) {
      setScore((s) => s + 1);
      addXp(XP_PER_CORRECT);
    }
    if (q.kind !== 'listen') speakChinese(q.word.hanzi);
  };

  const next = () => {
    if (i + 1 >= questions.length) {
      petReact('done');
      recordQuiz(Math.round((score / questions.length) * 100));
      onFinish(score);
    } else {
      setI(i + 1);
      setChosen(null);
    }
  };

  const prompt =
    q.kind === 'en2zh' ? 'How do you say this in Chinese?' : q.kind === 'zh2en' ? 'What does this mean?' : 'Listen and choose the meaning';

  return (
    <View style={styles.playScreen}>
      <View style={styles.playHeader}>
        <Pressable onPress={onQuit} hitSlop={12}>
          <Text style={styles.quit}>✕</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={(i + (chosen ? 1 : 0)) / questions.length} color={colors.gold} height={10} />
        </View>
        <Text style={styles.counter}>
          {i + 1}/{questions.length}
        </Text>
        <PetBuddy />
      </View>

      <ScrollView contentContainerStyle={styles.playBody}>
        <Text style={styles.prompt}>{prompt}</Text>

        <Card style={styles.promptCard}>
          {q.kind === 'en2zh' && <Text style={styles.promptEnglish}>{q.word.english}</Text>}
          {q.kind === 'zh2en' && (
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.promptHanzi}>{q.word.hanzi}</Text>
              <Text style={styles.promptPinyin}>{q.word.pinyin}</Text>
            </View>
          )}
          {q.kind === 'listen' && (
            <View style={{ alignItems: 'center' }}>
              <SpeakButton text={q.word.hanzi} size={88} />
              <Text style={styles.listenHint}>Tap to listen again</Text>
              {chosen && <Text style={styles.promptPinyin}>{q.word.hanzi} · {q.word.pinyin}</Text>}
            </View>
          )}
        </Card>

        {q.options.map((opt) => {
          const isRight = opt.id === q.word.id;
          const isChosen = opt.id === chosen;
          const bg = chosen ? (isRight ? colors.jadeSoft : isChosen ? colors.wrongSoft : colors.card) : colors.card;
          const border = chosen ? (isRight ? colors.jade : isChosen ? colors.wrong : colors.line) : colors.line;
          return (
            <Pressable
              key={opt.id}
              onPress={() => choose(opt)}
              style={({ pressed }) => [styles.answer, { backgroundColor: bg, borderColor: border, opacity: pressed && !chosen ? 0.7 : 1 }]}
            >
              {q.kind === 'en2zh' ? (
                <View>
                  <Text style={styles.answerHanzi}>{opt.hanzi}</Text>
                  {chosen && <Text style={styles.answerPinyin}>{opt.pinyin}</Text>}
                </View>
              ) : (
                <Text style={styles.answerText}>{opt.english}</Text>
              )}
              {chosen && isRight && <Text style={styles.mark}>✓</Text>}
              {chosen && isChosen && !isRight && <Text style={[styles.mark, { color: colors.wrong }]}>✕</Text>}
            </Pressable>
          );
        })}
      </ScrollView>

      {chosen && (
        <View style={styles.footer}>
          <Text style={[styles.feedback, { color: chosen === q.word.id ? colors.jade : colors.wrong }]}>
            {chosen === q.word.id ? 'Correct! 对了!' : `Answer: ${q.word.hanzi} (${q.word.pinyin}) = ${q.word.english}`}
          </Text>
          <Button title={i + 1 >= questions.length ? 'See results' : 'Next'} onPress={next} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 30, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 4, marginBottom: 16, lineHeight: 21 },
  section: { fontSize: 13, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginTop: 24, marginBottom: 2, textTransform: 'uppercase' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  featured: { backgroundColor: colors.red, paddingVertical: 20 },
  optionEmoji: { fontSize: 28 },
  optionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  optionSub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  bigEmoji: { fontSize: 72 },
  resultTitle: { fontSize: 26, fontWeight: '800', color: colors.ink, marginTop: 12, textAlign: 'center' },
  resultScore: { fontSize: 18, color: colors.muted, marginTop: 8 },
  resultXp: { fontSize: 22, fontWeight: '800', color: colors.gold, marginTop: 8, marginBottom: 28 },
  wide: { alignSelf: 'stretch' },
  playScreen: { flex: 1 },
  playHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
  quit: { fontSize: 22, color: colors.muted, fontWeight: '600' },
  counter: { color: colors.muted, fontWeight: '700' },
  playBody: { padding: 20, paddingTop: 8, paddingBottom: 20 },
  prompt: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 12 },
  promptCard: { alignItems: 'center', justifyContent: 'center', minHeight: 150, marginBottom: 18, borderRadius: radius.lg },
  promptEnglish: { fontSize: 30, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  promptHanzi: { fontSize: 56, color: colors.ink },
  promptPinyin: { fontSize: 20, color: colors.red, fontWeight: '600', marginTop: 6 },
  listenHint: { fontSize: 13, color: colors.muted, marginTop: 10 },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  answerHanzi: { fontSize: 26, color: colors.ink },
  answerPinyin: { fontSize: 14, color: colors.muted, marginTop: 2 },
  answerText: { fontSize: 18, color: colors.ink, flex: 1 },
  mark: { fontSize: 22, fontWeight: '800', color: colors.jade, marginLeft: 8 },
  footer: { padding: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg, gap: 12 },
  feedback: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
