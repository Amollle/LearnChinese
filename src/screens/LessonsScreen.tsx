import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, ProgressBar } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { lessons, levels } from '../data/lessons';
import { colors } from '../theme';

export default function LessonsScreen({
  onOpenLesson,
  onOpenSpeaking,
}: {
  onOpenLesson: (id: string) => void;
  onOpenSpeaking: () => void;
}) {
  const { progress } = useProgress();
  const { user } = useAuth();
  const startIndex = Math.max(0, lessons.findIndex((l) => l.id === user?.startLessonId));

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Lessons</Text>
      <Text style={styles.subtitle}>Guided lessons: meet new words, practice them, then use them in sentences.</Text>

      <Pressable onPress={onOpenSpeaking}>
        {({ pressed }) => (
          <Card style={[styles.speakCard, pressed && { opacity: 0.85 }]}>
            <Text style={{ fontSize: 30 }}>🎙️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.speakTitle}>Speaking practice</Text>
              <Text style={styles.speakSub}>Say words out loud — get feedback on your tones and sounds</Text>
            </View>
            <Text style={styles.speakArrow}>→</Text>
          </Card>
        )}
      </Pressable>

      {levels.map((level) => (
        <View key={level.id}>
          <Text style={styles.levelHeader}>
            Level {level.id} · {level.name}
          </Text>
      {lessons.map((lesson, index) => {
        if (!level.lessonIds.includes(lesson.id)) return null;
        const done = lesson.words.filter((w) => progress.learned.includes(w.id)).length;
        const complete = done === lesson.words.length;
        const placedOut = (progress.placedOut ?? []).includes(lesson.id);
        const finished = progress.completedLessons.includes(lesson.id);
        return (
          <Pressable key={lesson.id} onPress={() => onOpenLesson(lesson.id)}>
            {({ pressed }) => (
              <Card style={[styles.lesson, pressed && { opacity: 0.85 }]}>
                <View style={[styles.emojiWrap, complete && { backgroundColor: colors.jadeSoft }]}>
                  <Text style={styles.emoji}>{lesson.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.number}>
                    LESSON {index + 1}
                    {placedOut ? '  ·  SKIPPED (PLACEMENT)' : finished ? '  ·  DONE' : index === startIndex ? '  ·  START HERE' : ''}
                  </Text>
                  <Text style={styles.lessonTitle}>
                    {lesson.title} <Text style={styles.chinese}>{lesson.chineseTitle}</Text>
                  </Text>
                  <Text style={styles.desc}>{lesson.description}</Text>
                  <View style={styles.progressRow}>
                    <View style={{ flex: 1 }}>
                      <ProgressBar value={done / lesson.words.length} color={complete ? colors.jade : colors.red} />
                    </View>
                    <Text style={styles.count}>{complete ? '✓' : `${done}/${lesson.words.length}`}</Text>
                  </View>
                </View>
              </Card>
            )}
          </Pressable>
        );
      })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 4, marginBottom: 12 },
  lesson: { flexDirection: 'row', gap: 14, marginTop: 12, alignItems: 'center' },
  emojiWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 28 },
  speakCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.jade, marginTop: 6 },
  speakTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  speakSub: { fontSize: 13, color: '#E1F2EC', marginTop: 2 },
  speakArrow: { color: '#fff', fontSize: 26, fontWeight: '700' },
  levelHeader: { fontSize: 14, fontWeight: '800', color: colors.red, letterSpacing: 1, marginTop: 22, textTransform: 'uppercase' },
  number: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 1 },
  lessonTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 2 },
  chinese: { color: colors.red, fontWeight: '600' },
  desc: { fontSize: 13, color: colors.muted, marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  count: { fontSize: 13, color: colors.muted, fontWeight: '700', minWidth: 32, textAlign: 'right' },
});
