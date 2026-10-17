import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MAX_DAILY_GOAL, MIN_DAILY_GOAL, useProgress } from '../context/ProgressContext';
import { colors, radius } from '../theme';
import { Button } from './ui';

const PRESETS = [
  { xp: 20, emoji: '🌱', name: 'Casual', hint: 'About 5 minutes a day' },
  { xp: 50, emoji: '📘', name: 'Regular', hint: 'About 10 minutes — roughly one lesson' },
  { xp: 100, emoji: '🔥', name: 'Serious', hint: 'About 20 minutes — a lesson plus review' },
  { xp: 150, emoji: '🚀', name: 'Intense', hint: 'About 30 minutes — lessons, review and quizzes' },
];

/** A pop-up for choosing the daily XP goal: pick a preset or set a custom amount. */
export default function GoalPicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { dailyGoal, setDailyGoal, progress } = useProgress();
  const [value, setValue] = useState(dailyGoal);

  useEffect(() => {
    if (visible) setValue(dailyGoal);
  }, [visible, dailyGoal]);

  const step = (delta: number) => setValue((v) => Math.max(MIN_DAILY_GOAL, Math.min(MAX_DAILY_GOAL, v + delta)));
  const isPreset = PRESETS.some((p) => p.xp === value);

  const save = () => {
    setDailyGoal(value);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView contentContainerStyle={{ padding: 22 }} bounces={false}>
            <View style={styles.handle} />
            <Text style={styles.title}>Daily XP goal</Text>
            <Text style={styles.subtitle}>
              How much do you want to practice each day? You earn XP from lessons, reviews, quizzes and games.
            </Text>

            {PRESETS.map((p) => {
              const active = value === p.xp;
              return (
                <Pressable key={p.xp} onPress={() => setValue(p.xp)} style={[styles.option, active && styles.optionActive]}>
                  <Text style={styles.optionEmoji}>{p.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionName}>{p.name}</Text>
                    <Text style={styles.optionHint}>{p.hint}</Text>
                  </View>
                  <Text style={[styles.optionXp, active && { color: colors.red }]}>{p.xp} XP</Text>
                </Pressable>
              );
            })}

            <View style={[styles.custom, !isPreset && styles.optionActive]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionName}>✏️ Custom</Text>
                <Text style={styles.optionHint}>Any amount from {MIN_DAILY_GOAL} to {MAX_DAILY_GOAL} XP</Text>
              </View>
              <Pressable onPress={() => step(-10)} style={styles.stepBtn} hitSlop={6} accessibilityLabel="Lower goal">
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text style={styles.customValue}>{value}</Text>
              <Pressable onPress={() => step(10)} style={styles.stepBtn} hitSlop={6} accessibilityLabel="Raise goal">
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>

            <Text style={styles.today}>
              Today so far: {progress.xpToday} XP{progress.xpToday >= value ? ' — this goal is already reached 🎉' : ''}
            </Text>

            <Button title={`Set goal to ${value} XP a day`} onPress={save} style={{ marginTop: 6 }} />
            <Pressable onPress={onClose} style={styles.cancel} hitSlop={8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,33,24,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '90%' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  optionActive: { borderColor: colors.red, backgroundColor: colors.redSoft },
  optionEmoji: { fontSize: 26 },
  optionName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  optionHint: { fontSize: 13, color: colors.muted, marginTop: 2 },
  optionXp: { fontSize: 16, fontWeight: '800', color: colors.muted },
  custom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 14,
  },
  stepBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: -2 },
  customValue: { fontSize: 20, fontWeight: '800', color: colors.ink, minWidth: 44, textAlign: 'center' },
  today: { fontSize: 13, color: colors.muted, textAlign: 'center', marginVertical: 14 },
  cancel: { alignSelf: 'center', marginTop: 12, padding: 6 },
  cancelText: { fontSize: 15, color: colors.muted, fontWeight: '700' },
});
