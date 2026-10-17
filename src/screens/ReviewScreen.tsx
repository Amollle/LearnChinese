import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button } from '../components/ui';
import { useProgress } from '../context/ProgressContext';
import { allWords } from '../data/lessons';
import StepPlayer, { PlayerResult } from '../lesson/StepPlayer';
import { buildReviewSteps } from '../lesson/steps';
import { colors } from '../theme';

/** Spaced-repetition review of the words that are due today. */
export default function ReviewScreen({ onClose }: { onClose: () => void }) {
  const { dueWordIds, recordAnswer, addXp } = useProgress();
  // freeze the list of words when the session starts
  const [steps] = useState(() => buildReviewSteps(allWords.filter((w) => dueWordIds.includes(w.id))));
  const [result, setResult] = useState<PlayerResult | null>(null);
  const remaining = useMemo(() => dueWordIds.length, [dueWordIds]);

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
});
