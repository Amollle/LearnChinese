import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ProgressBar, SpeakButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabaseConfigured } from '../lib/supabase';
import GoalPicker from '../components/GoalPicker';
import { todayKey, useProgress } from '../context/ProgressContext';
import { allWords, lessons } from '../data/lessons';
import { colors } from '../theme';
import PetHero from '../pet/PetHero';

function wordOfTheDay() {
  const key = todayKey();
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return allWords[hash % allWords.length];
}

export default function HomeScreen({
  onOpenLesson,
  onStartQuiz,
  onStartReview,
  onOpenPet,
}: {
  onOpenLesson: (id: string) => void;
  onStartQuiz: () => void;
  onStartReview: () => void;
  onOpenPet: () => void;
}) {
  const { progress, resetAll, dueWordIds, dailyGoal } = useProgress();
  const [goalPickerOpen, setGoalPickerOpen] = useState(false);
  const { user, logOut, retakePlacement } = useAuth();
  const word = wordOfTheDay();
  const startIndex = Math.max(0, lessons.findIndex((l) => l.id === user?.startLessonId));
  const nextLesson =
    lessons.slice(startIndex).find((l) => l.words.some((w) => !progress.learned.includes(w.id))) ??
    lessons.find((l) => l.words.some((w) => !progress.learned.includes(w.id))) ??
    lessons[startIndex];
  const nextDone = nextLesson.words.filter((w) => progress.learned.includes(w.id)).length;
  const goalReached = progress.xpToday >= dailyGoal;

  const confirmReset = () =>
    Alert.alert('Reset progress?', 'This clears your XP, streak and learned words.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetAll },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.hello}>你好, {user?.name}! 👋</Text>
      <Text style={styles.subtitle}>
        {user?.level ? `Level: ${user.level} · ` : ''}Let's learn some Chinese today.
      </Text>

      <PetHero onOpen={onOpenPet} />

      <View style={[styles.statsRow, { marginTop: 16 }]}>
        <Stat value={`${progress.streak}`} label="day streak" emoji="🔥" />
        <Stat value={`${progress.xp}`} label="total XP" emoji="⭐" />
        <Stat value={`${progress.learned.length}/${allWords.length}`} label="words" emoji="📚" />
      </View>

      <Pressable onPress={() => setGoalPickerOpen(true)} accessibilityLabel="Change daily goal">
        <Card style={styles.block}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Daily goal</Text>
            <Text style={styles.muted}>
              {Math.min(progress.xpToday, dailyGoal)} / {dailyGoal} XP
            </Text>
          </View>
          <ProgressBar value={progress.xpToday / dailyGoal} color={goalReached ? colors.jade : colors.gold} height={10} />
          <View style={[styles.rowBetween, { marginTop: 8, marginBottom: 0 }]}>
            <Text style={[styles.muted, { flex: 1 }]}>
              {goalReached ? 'Goal reached — great work! 🎉' : `${dailyGoal - progress.xpToday} XP to go today`}
            </Text>
            <Text style={styles.changeGoal}>Change ✏️</Text>
          </View>
        </Card>
      </Pressable>
      <GoalPicker visible={goalPickerOpen} onClose={() => setGoalPickerOpen(false)} />


      {progress.learned.length > 0 && (
        <Pressable onPress={onStartReview}>
          <Card style={[styles.block, styles.reviewCard, dueWordIds.length === 0 && styles.reviewCardDone]}>
            <Text style={styles.reviewEmoji}>{dueWordIds.length > 0 ? '🧠' : '✅'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewTitle}>
                {dueWordIds.length > 0 ? `Review: ${dueWordIds.length} word${dueWordIds.length === 1 ? '' : 's'} due` : 'Review: all caught up'}
              </Text>
              <Text style={styles.reviewSub}>
                {dueWordIds.length > 0
                  ? 'Strengthen your memory before you forget'
                  : 'Words come back here when it’s time to review them'}
              </Text>
            </View>
            {dueWordIds.length > 0 && <Text style={styles.reviewArrow}>→</Text>}
          </Card>
        </Pressable>
      )}

      <Pressable onPress={() => onOpenLesson(nextLesson.id)}>
        <Card style={[styles.block, styles.continueCard]}>
          <Text style={styles.continueLabel}>CONTINUE LEARNING</Text>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.continueTitle}>
                {nextLesson.emoji} {nextLesson.title}
              </Text>
              <Text style={styles.continueSub}>
                {nextLesson.chineseTitle} · {nextDone}/{nextLesson.words.length} learned
              </Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </View>
        </Card>
      </Pressable>

      <Card style={styles.block}>
        <Text style={styles.cardTitle}>Word of the day</Text>
        <View style={[styles.rowBetween, { marginTop: 10 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.wotdHanzi}>{word.hanzi}</Text>
            <Text style={styles.wotdPinyin}>{word.pinyin}</Text>
            <Text style={styles.muted}>{word.english}</Text>
          </View>
          <SpeakButton text={word.hanzi} size={52} />
        </View>
      </Card>

      <Button title="Take a quick quiz" onPress={onStartQuiz} variant="secondary" style={styles.block} />

      <Text style={styles.version}>App version 20 · Speaking in lessons · {supabaseConfigured ? 'synced to cloud ☁️' : 'saved on this phone'}</Text>
      <View style={styles.footerLinks}>
        <Pressable onPress={retakePlacement} hitSlop={8}>
          <Text style={styles.resetText}>Retake placement quiz</Text>
        </Pressable>
        <Pressable onPress={confirmReset} hitSlop={8}>
          <Text style={styles.resetText}>Reset progress</Text>
        </Pressable>
        <Pressable onPress={logOut} hitSlop={8}>
          <Text style={[styles.resetText, { color: colors.red }]}>Log out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Stat({ value, label, emoji }: { value: string; label: string; emoji: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  hello: { fontSize: 28, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 16, color: colors.muted, marginTop: 2, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 4 },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  block: { marginTop: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 14, color: colors.muted },
  reviewCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.jade },
  reviewCardDone: { backgroundColor: colors.jadeSoft },
  reviewEmoji: { fontSize: 30 },
  reviewTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  reviewSub: { fontSize: 13, color: '#E1F2EC', marginTop: 2 },
  reviewArrow: { color: '#fff', fontSize: 26, fontWeight: '700' },
  continueCard: { backgroundColor: colors.red },
  continueLabel: { color: '#FFD9D4', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  continueTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  continueSub: { color: '#FFE9E6', fontSize: 14, marginTop: 4 },
  arrow: { color: '#fff', fontSize: 28, fontWeight: '700', marginLeft: 12 },
  wotdHanzi: { fontSize: 40, color: colors.ink, fontWeight: '600' },
  wotdPinyin: { fontSize: 18, color: colors.red, fontWeight: '600', marginVertical: 2 },
  changeGoal: { fontSize: 14, fontWeight: '800', color: colors.red, marginLeft: 10 },
  petCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  petCardReward: { backgroundColor: colors.goldSoft, borderWidth: 2, borderColor: colors.gold },
  petTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  petSub: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  petArrow: { fontSize: 24, fontWeight: '700', color: colors.ink },
  version: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 24 },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 20, marginTop: 28 },
  resetText: { color: colors.muted, fontSize: 13, textDecorationLine: 'underline' },
});
