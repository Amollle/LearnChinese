import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card } from '../components/ui';
import { useProgress } from '../context/ProgressContext';
import { allWords } from '../data/lessons';
import StepPlayer, { PlayerResult } from '../lesson/StepPlayer';
import { buildReviewSteps } from '../lesson/steps';
import { playChinese } from '../services/audio';
import { colors, radius } from '../theme';

/** Spaced-repetition review of the words that are due today. */
export default function ReviewScreen({ onClose }: { onClose: () => void }) {
  const { dueWordIds, recordAnswer, addXp, progress, coachWords, removeCoachWord } = useProgress();
  // freeze the list of words when the session starts
  const [steps] = useState(() => buildReviewSteps(allWords.filter((w) => dueWordIds.includes(w.id)), 10, progress.written ?? []));
  const [result, setResult] = useState<PlayerResult | null>(null);
  // phrases the AI coach saved come first, then the normal word review
  const [showingCoach, setShowingCoach] = useState(() => coachWords.length > 0);
  const remaining = useMemo(() => dueWordIds.length, [dueWordIds]);

  if (showingCoach) {
    return (
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 56, textAlign: 'center' }}>🎓</Text>
        <Text style={styles.listTitle}>From your talks</Text>
        <Text style={styles.listNote}>
          Your coach picked these out of your conversations. Tap one to hear it, and tap “I know this” once it sticks.
        </Text>
        {coachWords.map((w) => (
          <Card key={w.zh} style={styles.phraseCard}>
            <Pressable onPress={() => playChinese(w.zh)}>
              <Text style={styles.phraseZh}>
                {w.zh} <Text style={styles.replay}>🔊</Text>
              </Text>
              <Text style={styles.phrasePy}>{w.py}</Text>
              <Text style={styles.phraseEn}>{w.en}</Text>
              {!!w.why && <Text style={styles.phraseWhy}>{w.why}</Text>}
            </Pressable>
            <Pressable onPress={() => removeCoachWord(w.zh)} hitSlop={6} style={styles.knowBtn}>
              <Text style={styles.knowText}>✓ I know this</Text>
            </Pressable>
          </Card>
        ))}
        <Button
          title={steps.length > 0 ? 'Now review my words' : 'Back to Home'}
          onPress={() => (steps.length > 0 ? setShowingCoach(false) : onClose())}
          style={{ alignSelf: 'stretch', marginTop: 18 }}
        />
      </ScrollView>
    );
  }

  if (result) {
    const pct = result.total ? Math.round((result.correct / result.total) * 100) : 100;
    return (
      <ScrollView contentContainerStyle={styles.center}>
        <Text style={{ fontSize: 72 }}>🧠</Text>
        <Text style={styles.title}>Review done!</Text>
        <Text style={styles.sub}>
          {pct}% correct · +{result.correct * 2 + 5} XP
        </Text>
        <Text style={styles.note}>
          {remaining > 0
            ? `${remaining} word${remaining === 1 ? '' : 's'} still due — words you missed come back sooner.`
            : 'You’re all caught up for today. Come back tomorrow for your next review!'}
        </Text>
        <Button title="Back to Home" onPress={onClose} style={{ alignSelf: 'stretch' }} />
      </ScrollView>
    );
  }

  if (steps.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.center}>
        <Text style={{ fontSize: 72 }}>✅</Text>
        <Text style={styles.title}>Nothing to review</Text>
        <Text style={styles.note}>Finish a lesson first — its words will show up here when it's time to review them.</Text>
        <Button title="Back to Home" onPress={onClose} style={{ alignSelf: 'stretch' }} />
      </ScrollView>
    );
  }

  return (
    <StepPlayer
      steps={steps}
      onClose={onClose}
      onWordResult={recordAnswer}
      onFinish={(r) => {
        addXp(r.correct * 2 + 5);
        setResult(r);
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 8 },
  sub: { fontSize: 17, color: colors.muted, marginTop: 6 },
  note: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 21, marginVertical: 22 },

  list: { padding: 20, paddingBottom: 40 },
  listTitle: { fontSize: 26, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: 6 },
  listNote: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 6, marginBottom: 16 },
  phraseCard: { marginBottom: 10 },
  phraseZh: { fontSize: 22, color: colors.ink },
  replay: { fontSize: 13 },
  phrasePy: { fontSize: 14, color: colors.red, marginTop: 2 },
  phraseEn: { fontSize: 14, color: colors.muted, marginTop: 2 },
  phraseWhy: { fontSize: 13, color: colors.jade, marginTop: 6, lineHeight: 18 },
  knowBtn: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: colors.jadeSoft, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 12 },
  knowText: { fontSize: 13, fontWeight: '800', color: colors.jade },
});
