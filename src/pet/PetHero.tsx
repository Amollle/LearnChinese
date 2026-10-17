import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProgressBar } from '../components/ui';
import { todayKey, useProgress } from '../context/ProgressContext';
import { playChinese } from '../services/audio';
import { colors, radius, shadow } from '../theme';
import Panda from './Panda';
import { current, Line, LINES, moodOf, rewardFor } from './petLogic';

/** The big panda at the top of Home — the first thing you see when you open the app. */
export default function PetHero({ onOpen }: { onOpen: () => void }) {
  const { progress, dailyGoal, updatePet } = useProgress();
  const pet = progress.pet ? current(progress.pet) : undefined;
  const goalReached = progress.xpToday >= dailyGoal;

  if (!pet) {
    return (
      <Pressable onPress={onOpen} style={({ pressed }) => [styles.hero, styles.adopt, pressed && { opacity: 0.9 }]}>
        <Panda mood="happy" size={150} />
        <Text style={styles.adoptTitle}>A panda is waiting for you! 🐼</Text>
        <Text style={styles.adoptSub}>Adopt it, name it, and earn coins to feed and dress it up every time you reach your daily goal.</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Adopt your panda →</Text>
        </View>
      </Pressable>
    );
  }

  const mood = moodOf(pet);
  const rewardReady = goalReached && pet.lastRewardDate !== todayKey();
  const reward = rewardFor(progress.streak);
  const line: Line =
    mood === 'hungry' ? LINES.starving : mood === 'sad' ? LINES.missed : rewardReady ? LINES.awesome : goalReached ? LINES.happy : LINES.hello;

  const claim = () => {
    updatePet((p) => (p ? { ...p, coins: p.coins + reward, lastRewardDate: todayKey() } : p));
    playChinese(LINES.thanks.zh);
  };

  return (
    <View style={[styles.hero, mood === 'hungry' || mood === 'sad' ? styles.heroNeedy : null]}>
      <View style={styles.topRow}>
        <Text style={styles.name}>{pet.name}</Text>
        <View style={styles.coins}>
          <Text style={styles.coinsText}>🪙 {pet.coins}</Text>
        </View>
      </View>

      <Pressable onPress={() => playChinese(line.zh)} style={styles.bubble}>
        <Text style={styles.bubbleZh}>{line.zh} 🔊</Text>
        <Text style={styles.bubbleEn}>
          {line.py} · {line.en}
        </Text>
      </Pressable>

      <Panda mood={mood} wearing={pet.wearing} size={170} onPress={onOpen} />

      <View style={styles.meters}>
        <Meter label="饱 Full" value={pet.hunger} color={pet.hunger < 25 ? colors.wrong : colors.gold} />
        <Meter label="开心 Happy" value={pet.happiness} color={pet.happiness < 30 ? colors.wrong : colors.jade} />
      </View>

      {rewardReady ? (
        <Pressable onPress={claim} style={({ pressed }) => [styles.cta, styles.ctaGold, pressed && { opacity: 0.85 }]}>
          <Text style={styles.ctaText}>🎁 Claim {reward} coins!</Text>
        </Pressable>
      ) : (
        <Pressable onPress={onOpen} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}>
          <Text style={styles.ctaText}>
            {mood === 'hungry' ? '🎋 Feed ' + pet.name : mood === 'sad' ? '⚽ Play with ' + pet.name : '🛍️ Visit the shop'} →
          </Text>
        </Pressable>
      )}
      {!goalReached && (
        <Text style={styles.hint}>
          Earn {dailyGoal - progress.xpToday} more XP today to get {reward} coins 🪙
        </Text>
      )}
    </View>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.meterLabel}>
        {label} <Text style={styles.meterPct}>{Math.round(value)}%</Text>
      </Text>
      <ProgressBar value={value / 100} color={color} height={8} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: '#EAF5EF', borderRadius: radius.lg, padding: 16, alignItems: 'center', marginTop: 4, borderWidth: 2, borderColor: '#CFE8DA', ...shadow },
  heroNeedy: { backgroundColor: '#FDF0E6', borderColor: '#F3D2B8' },
  adopt: { paddingVertical: 20 },
  adoptTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: 8, textAlign: 'center' },
  adoptSub: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch' },
  name: { fontSize: 24, fontWeight: '800', color: colors.ink },
  coins: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  coinsText: { fontSize: 16, fontWeight: '800', color: colors.ink },
  bubble: { backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 7, alignItems: 'center', marginTop: 8, borderWidth: 2, borderColor: colors.line },
  bubbleZh: { fontSize: 19, fontWeight: '700', color: colors.ink },
  bubbleEn: { fontSize: 12, color: colors.muted, marginTop: 1 },
  meters: { flexDirection: 'row', gap: 14, alignSelf: 'stretch', marginTop: 4 },
  meterLabel: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  meterPct: { fontWeight: '600', color: colors.muted },
  cta: { alignSelf: 'stretch', backgroundColor: colors.jade, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  ctaGold: { backgroundColor: colors.gold },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  hint: { fontSize: 12, color: colors.muted, marginTop: 8 },
});
