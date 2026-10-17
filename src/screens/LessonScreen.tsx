import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, SpeakButton } from '../components/ui';
import { useProgress } from '../context/ProgressContext';
import { Lesson } from '../data/lessons';
import StepPlayer, { PlayerResult } from '../lesson/StepPlayer';
import { buildLessonSteps } from '../lesson/steps';
import { colors, radius } from '../theme';

type Phase = { name: 'overview' } | { name: 'play'; key: number } | { name: 'done'; result: PlayerResult; xp: number };

const XP_PER_CORRECT = 2;
const XP_LESSON_BONUS = 10;

export default function LessonScreen({
  lesson,
  onClose,
  onQuiz,
}: {
  lesson: Lesson;
  onClose: () => void;
  onQuiz: (lessonId: string) => void;
}) {
  const { progress, recordAnswer, completeLesson, isLearned } = useProgress();
  const [phase, setPhase] = useState<Phase>({ name: 'overview' });
  const completed = progress.completedLessons.includes(lesson.id);

  if (phase.name === 'play') {
    return (
      <StepPlayer
        key={phase.key}
        steps={buildLessonSteps(lesson)}
        onClose={() => setPhase({ name: 'overview' })}
        onWordResult={recordAnswer}
        onFinish={(result) => {
          const xp = result.correct * XP_PER_CORRECT + XP_LESSON_BONUS;
          completeLesson(
            lesson.id,
            lesson.words.map((w) => w.id),
            xp,
          );
          setPhase({ name: 'done', result, xp });
        }}
      />
    );
  }

  if (phase.name === 'done') {
    const pct = phase.result.total ? Math.round((phase.result.correct / phase.result.total) * 100) : 100;
    return (
      <ScrollView contentContainerStyle={styles.center}>
        <Text style={{ fontSize: 72 }}>{pct >= 80 ? '🎉' : '💪'}</Text>
        <Text style={styles.doneTitle}>Lesson complete!</Text>
        <Text style={styles.doneSub}>
          {lesson.emoji} {lesson.title} · {lesson.chineseTitle}
        </Text>
        <View style={styles.statsRow}>
          <Stat label="Accuracy" value={`${pct}%`} />
          <Stat label="XP earned" value={`+${phase.xp}`} />
          <Stat label="Words" value={`${lesson.words.length}`} />
        </View>
        <Text style={styles.doneNote}>
          These words are now in your review schedule. We'll bring each one back just before you'd forget it — check the
          Review card on the Home screen.
        </Text>
        <Button title="Take the lesson quiz" onPress={() => onQuiz(lesson.id)} style={styles.wide} />
        <Button title="Practice again" variant="secondary" onPress={() => setPhase({ name: 'play', key: Date.now() })} style={[styles.wide, { marginTop: 10 }]} />
        <Button title="Back to lessons" variant="secondary" onPress={onClose} style={[styles.wide, { marginTop: 10 }]} />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.back}>‹ Lessons</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.emoji}>{lesson.emoji}</Text>
        <Text style={styles.title}>
          {lesson.title} <Text style={styles.titleZh}>{lesson.chineseTitle}</Text>
        </Text>
        <Text style={styles.desc}>{lesson.description}</Text>

        <Card style={styles.howCard}>
          <Text style={styles.howTitle}>How this lesson works</Text>
          <How icon="👋" text="Meet each new word: hear it, see it, and read it in a sentence" />
          <How icon="🎧" text="Practice in small groups: listening, meaning, characters and tones" />
          <How icon="✍️" text="Learn the strokes, then watch, trace and write the characters" />
          <How icon="🎙️" text="Say words out loud and get feedback on your tones" />
          <How icon="🧩" text="Match pairs, then build real sentences from word tiles" />
          <How icon="🔁" text="Anything you miss comes back again before the end" />
        </Card>

        <Button
          title={completed ? 'Practice this lesson again' : 'Start lesson'}
          onPress={() => setPhase({ name: 'play', key: Date.now() })}
          style={{ marginTop: 6 }}
        />

        <Text style={styles.section}>Words in this lesson ({lesson.words.length})</Text>
        {lesson.words.map((w) => (
          <Card key={w.id} style={styles.wordRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.wordHanzi}>
                {w.hanzi} {isLearned(w.id) ? <Text style={styles.check}>✓</Text> : null}
              </Text>
              <Text style={styles.wordPinyin}>{w.pinyin}</Text>
              <Text style={styles.wordEnglish}>{w.english}</Text>
            </View>
            <SpeakButton text={w.hanzi} />
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

function How({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.howRow}>
      <Text style={styles.howIcon}>{icon}</Text>
      <Text style={styles.howText}>{text}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 17, color: colors.red, fontWeight: '700' },
  body: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  emoji: { fontSize: 48 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 6 },
  titleZh: { color: colors.red, fontWeight: '700' },
  desc: { fontSize: 15, color: colors.muted, marginTop: 4, marginBottom: 16 },
  howCard: { marginBottom: 14 },
  howTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  howRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  howIcon: { fontSize: 16, width: 22 },
  howText: { flex: 1, fontSize: 14, color: colors.ink, lineHeight: 20 },
  section: { fontSize: 13, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginTop: 26, marginBottom: 2, textTransform: 'uppercase' },
  wordRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  wordHanzi: { fontSize: 26, color: colors.ink },
  check: { color: colors.jade, fontSize: 18 },
  wordPinyin: { fontSize: 16, color: colors.red, fontWeight: '600', marginTop: 2 },
  wordEnglish: { fontSize: 14, color: colors.muted, marginTop: 2 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 8 },
  doneSub: { fontSize: 16, color: colors.muted, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 22, alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.md },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  doneNote: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginVertical: 20 },
  wide: { alignSelf: 'stretch' },
});
