import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ProgressBar, SpeakButton, speakChinese } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { lessons, levels } from '../data/lessons';
import { PASS_PER_LESSON, Question, questionsForLesson } from '../lesson/placement';
import { colors, radius } from '../theme';

/**
 * Placement test.
 * - 3 questions per lesson, getting harder through the levels
 *   (meaning → characters → full sentences).
 * - A lesson counts as "known" with at least 2 of 3 right.
 * - Known lessons (in order, from the start) are skipped: marked complete and put into review.
 * - The test ends early when a whole level is clearly too hard.
 */

type Phase = 'intro' | 'quiz' | 'result';

export default function PlacementScreen() {
  const { user, completePlacement } = useAuth();
  const { placeOut } = useProgress();
  const questions = useMemo(() => lessons.flatMap((l, i) => questionsForLesson(l, i)), []);
  const [phase, setPhase] = useState<Phase>('intro');
  const [i, setI] = useState(0);
  const [correctByLesson, setCorrectByLesson] = useState<number[]>(() => lessons.map(() => 0));
  const [stoppedEarly, setStoppedEarly] = useState(false);

  // Number of lessons known in a row from the start → where to begin
  const knownCount = useMemo(() => {
    let n = 0;
    while (n < lessons.length && correctByLesson[n] >= PASS_PER_LESSON) n++;
    return n;
  }, [correctByLesson]);

  const answer = (right: boolean) => {
    const q = questions[i];
    const nextCorrect = right ? correctByLesson.map((c, idx) => (idx === q.lessonIndex ? c + 1 : c)) : correctByLesson;
    if (right) setCorrectByLesson(nextCorrect);

    const next = questions[i + 1];
    const finishedLesson = !next || next.lessonIndex !== q.lessonIndex;
    if (finishedLesson) {
      // stop early if this level is clearly too hard: the user has failed 2 lessons in the current level,
      // or failed the very first lesson
      const level = levels.find((l) => l.lessonIds.includes(lessons[q.lessonIndex].id))!;
      const levelLessonIdx = level.lessonIds.map((id) => lessons.findIndex((l) => l.id === id)).filter((x) => x <= q.lessonIndex);
      const failed = levelLessonIdx.filter((x) => nextCorrect[x] < PASS_PER_LESSON).length;
      if (failed >= 2 || (q.lessonIndex === 0 && nextCorrect[0] < PASS_PER_LESSON)) {
        setStoppedEarly(true);
        setPhase('result');
        return;
      }
    }
    if (!next) setPhase('result');
    else setI(i + 1);
  };

  if (phase === 'intro') {
    return (
      <ScrollView contentContainerStyle={styles.center}>
        <Text style={styles.bigEmoji}>🧭</Text>
        <Text style={styles.title}>Welcome, {user?.name}!</Text>
        <Text style={styles.body}>
          Let's find your level. Questions get harder as you go, from single words to full sentences. The test stops
          early once we've found your level.{'\n\n'}Lessons you already know will be skipped. Don't guess — tap “I
          don't know” if you're not sure.
        </Text>
        <Button title="Start placement test" onPress={() => setPhase('quiz')} style={styles.wide} />
        <Button
          title="I'm a complete beginner — skip"
          variant="secondary"
          onPress={() => completePlacement('Beginner', lessons[0].id)}
          style={[styles.wide, { marginTop: 10 }]}
        />
      </ScrollView>
    );
  }

  if (phase === 'result') {
    const allKnown = knownCount >= lessons.length;
    const start = lessons[Math.min(knownCount, lessons.length - 1)];
    const levelOfStart = levels.find((l) => l.lessonIds.includes(start.id))!;
    const levelName = allKnown ? 'Intermediate+' : levelOfStart.name;
    const skipped = lessons.slice(0, knownCount);
    const answered = stoppedEarly ? i + 1 : questions.length;
    const totalCorrect = correctByLesson.reduce((a, b) => a + b, 0);

    const finish = () => {
      if (skipped.length) placeOut(skipped.map((l) => ({ id: l.id, wordIds: l.words.map((w) => w.id) })));
      completePlacement(levelName, start.id);
    };

    return (
      <ScrollView contentContainerStyle={styles.center}>
        <Text style={styles.bigEmoji}>🎯</Text>
        <Text style={styles.title}>Your level: {levelName}</Text>
        <Text style={styles.body}>
          {totalCorrect} correct out of {answered} questions
          {stoppedEarly ? ' — we stopped once we found your level.' : '.'}
        </Text>

        <Card style={styles.levelCard}>
          {levels.map((lv) => (
            <View key={lv.id} style={styles.levelBlock}>
              <Text style={styles.levelTitle}>
                Level {lv.id} · {lv.name}
              </Text>
              {lv.lessonIds.map((id) => {
                const idx = lessons.findIndex((l) => l.id === id);
                const l = lessons[idx];
                const known = idx < knownCount;
                const isStart = !allKnown && idx === knownCount;
                return (
                  <View key={id} style={styles.lessonLine}>
                    <Text style={styles.lessonName}>
                      {l.emoji} {l.title}
                    </Text>
                    <Text style={[styles.lessonState, known && { color: colors.jade }, isStart && { color: colors.red }]}>
                      {known ? '✓ Skipped' : isStart ? '▶ Start here' : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </Card>

        <Text style={styles.note}>
          {skipped.length > 0
            ? `${skipped.length} lesson${skipped.length > 1 ? 's' : ''} skipped. Their words will appear in your daily Review now and then, so you keep them fresh. You can still open any skipped lesson.`
            : 'We’ll start from the very first lesson.'}
        </Text>

        <Button title={allKnown ? 'Go to the app' : `Start Lesson ${knownCount + 1}: ${start.title}`} onPress={finish} style={styles.wide} />
      </ScrollView>
    );
  }

  const q = questions[i];
  const level = levels.find((l) => l.lessonIds.includes(lessons[q.lessonIndex].id))!;
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Level {level.id}</Text>
        <View style={{ flex: 1 }}>
          <ProgressBar value={i / questions.length} color={colors.gold} height={10} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.quizBody} key={i}>
        <QuestionView q={q} onAnswer={answer} />
      </ScrollView>
    </View>
  );
}

function QuestionView({ q, onAnswer }: { q: Question; onAnswer: (right: boolean) => void }) {
  React.useEffect(() => {
    if (q.kind === 'listen') speakChinese(q.word.hanzi);
  }, [q]);

  const bigOptions = q.kind === 'en2zh' || q.kind === 'fill';
  return (
    <View>
      <Text style={styles.prompt}>{q.prompt}</Text>
      <Card style={styles.promptCard}>
        {q.kind === 'zh2en' && <Text style={styles.promptHanzi}>{q.word.hanzi}</Text>}
        {q.kind === 'listen' && <SpeakButton text={q.word.hanzi} size={80} />}
        {q.kind === 'en2zh' && <Text style={styles.promptEnglish}>{q.word.english}</Text>}
        {q.kind === 'fill' && (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.fillSentence}>{q.fillSentence}</Text>
            <Text style={styles.fillEnglish}>{q.fillEnglish}</Text>
          </View>
        )}
      </Card>
      <View style={bigOptions ? styles.grid : undefined}>
        {q.options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onAnswer(opt === q.answer)}
            style={({ pressed }) => [styles.answer, bigOptions && styles.answerHalf, pressed && { backgroundColor: colors.goldSoft }]}
          >
            <Text style={bigOptions ? styles.answerHanzi : styles.answerText}>{opt}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => onAnswer(false)} style={styles.dontKnow} hitSlop={8}>
        <Text style={styles.dontKnowText}>I don't know</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  bigEmoji: { fontSize: 64 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, marginTop: 12, textAlign: 'center' },
  body: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 10, marginBottom: 20, lineHeight: 23 },
  wide: { alignSelf: 'stretch' },
  levelCard: { alignSelf: 'stretch', marginBottom: 14 },
  levelBlock: { marginBottom: 10 },
  levelTitle: { fontSize: 13, fontWeight: '800', color: colors.muted, letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  lessonLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  lessonName: { fontSize: 15, color: colors.ink },
  lessonState: { fontSize: 14, fontWeight: '700', color: colors.muted },
  note: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  quizBody: { padding: 20, paddingTop: 8 },
  prompt: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 12 },
  promptCard: { alignItems: 'center', justifyContent: 'center', minHeight: 140, marginBottom: 18, borderRadius: radius.lg },
  promptHanzi: { fontSize: 56, color: colors.ink },
  promptEnglish: { fontSize: 28, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  fillSentence: { fontSize: 28, color: colors.ink, textAlign: 'center' },
  fillEnglish: { fontSize: 15, color: colors.muted, marginTop: 8, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  answer: {
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  answerHalf: { width: '48%', alignItems: 'center' },
  answerHanzi: { fontSize: 26, color: colors.ink },
  answerText: { fontSize: 18, color: colors.ink },
  dontKnow: { alignSelf: 'center', marginTop: 8, padding: 8 },
  dontKnowText: { fontSize: 16, color: colors.muted, fontWeight: '700', textDecorationLine: 'underline' },
});
