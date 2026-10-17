import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import { playChinese } from '../services/audio';
import { colors } from '../theme';
import Panda from './Panda';
import { chatLine, current, Line, LINES, Mood, moodOf } from './petLogic';

/** What just happened while learning — the mini panda reacts to it. */
export type Reaction = 'right' | 'wrong' | 'done';
const listeners = new Set<(r: Reaction) => void>();
/** Call this from any learning screen when the learner answers or finishes something. */
export function petReact(r: Reaction) {
  listeners.forEach((l) => l(r));
}

const SAY: Record<Reaction, Line[]> = {
  right: [
    { zh: '对！', py: 'duì!', en: 'Right!' },
    { zh: '太好了！', py: 'tài hǎo le!', en: 'Great!' },
    LINES.awesome,
  ],
  wrong: [LINES.cheer, { zh: '没关系！', py: 'méi guānxi!', en: "It's OK!" }, { zh: '再试试！', py: 'zài shìshi!', en: 'Try again!' }],
  done: [LINES.happy, LINES.awesome, LINES.thanks],
};
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/**
 * A small copy of the learner's panda that sits on learning pages.
 * It cheers when you get things right, encourages you when you miss, and talks when tapped.
 * Shows nothing until the learner has adopted a panda.
 */
export default function PetBuddy({ size = 46 }: { size?: number }) {
  const { progress, dailyGoal } = useProgress();
  const [bubble, setBubble] = useState<Line | null>(null);
  const [moodOverride, setMoodOverride] = useState<Mood | null>(null);
  const hop = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pet = progress.pet ? current(progress.pet) : undefined;

  const show = (line: Line, mood: Mood | null, jump: boolean) => {
    setBubble(line);
    setMoodOverride(mood);
    if (jump) {
      hop.setValue(0);
      Animated.sequence([
        Animated.timing(hop, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(hop, { toValue: 0, duration: 260, easing: Easing.bounce, useNativeDriver: true }),
      ]).start();
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setBubble(null);
      setMoodOverride(null);
    }, 2200);
  };

  useEffect(() => {
    const l = (r: Reaction) => show(pick(SAY[r]), r === 'wrong' ? 'okay' : 'happy', r !== 'wrong');
    listeners.add(l);
    return () => {
      listeners.delete(l);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!pet) return null;

  const tap = () => {
    const line = chatLine(pet, progress.xpToday >= dailyGoal);
    show(line, null, true);
    playChinese(line.zh);
  };

  return (
    <View style={{ width: size, height: size, zIndex: 10 }}>
      {bubble && (
        <View pointerEvents="none" style={[styles.bubbleWrap, { right: size + 4 }]}>
          <View style={styles.bubble}>
            <Text style={styles.zh} numberOfLines={1}>
              {bubble.zh} <Text style={styles.py}>{bubble.py}</Text>
            </Text>
            <Text style={styles.en} numberOfLines={1}>
              {bubble.en}
            </Text>
          </View>
        </View>
      )}
      <Animated.View style={{ transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }}>
        <Panda mood={moodOverride ?? moodOf(pet)} wearing={pet.wearing} size={size} onPress={tap} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: { position: 'absolute', top: 0, width: 240, alignItems: 'flex-end' },
  bubble: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.line,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'flex-end',
    shadowColor: '#2B2118',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  zh: { fontSize: 15, color: colors.ink, fontWeight: '700' },
  py: { fontSize: 12, color: colors.red, fontWeight: '700' },
  en: { fontSize: 11, color: colors.muted },
});
