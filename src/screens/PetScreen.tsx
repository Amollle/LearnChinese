import type { ScrollViewInstance } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, ProgressBar } from '../components/ui';
import { todayKey, useProgress } from '../context/ProgressContext';
import ItemArt from '../pet/ItemArt';
import Panda from '../pet/Panda';
import { Scene, SCENE_MS, SceneItem, sceneFor, usePandaMotion } from '../pet/PetScene';
import { chatLine, current, ItemKind, Line, LINES, moodOf, NAME_IDEAS, newPet, PetItem, rewardFor, SHOP, START_COINS, wearItem } from '../pet/petLogic';
import { playChinese } from '../services/audio';
import { colors, radius } from '../theme';

const MOOD_TEXT = { happy: 'Very happy', okay: 'Doing okay', hungry: 'Hungry!', sad: 'A bit sad' } as const;
const TABS: { key: ItemKind | 'trad'; label: string }[] = [
  { key: 'food', label: '🍎 Food' },
  { key: 'toy', label: '⚽ Toys' },
  { key: 'outfit', label: '🎀 Outfits' },
  { key: 'trad', label: '🏮 Traditional' },
];

export default function PetScreen({ onClose }: { onClose?: () => void }) {
  const { progress, updatePet, dailyGoal } = useProgress();
  const [now, setNow] = useState(Date.now());
  const [line, setLine] = useState<Line | null>(null);
  const [tab, setTab] = useState<ItemKind | 'trad'>('food');
  const [notice, setNotice] = useState<string | null>(null);
  const [culture, setCulture] = useState<string | null>(null);
  const [hearts, setHearts] = useState<{ id: number; emoji: string }[]>([]);
  const heartId = useRef(0);
  const [scene, setScene] = useState<Scene | null>(null);
  const [chewing, setChewing] = useState(false);
  const busy = useRef(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const motion = usePandaMotion();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const saved = progress.pet;
  const pet = saved ? current(saved, now) : undefined;
  const goalReached = progress.xpToday >= dailyGoal;
  const rewardReady = !!pet && goalReached && pet.lastRewardDate !== todayKey();
  const reward = rewardFor(progress.streak);

  const say = (l: Line) => {
    setLine(l);
    playChinese(l.zh);
  };

  // Greet once when the screen opens.
  const greeted = useRef(false);
  useEffect(() => {
    if (greeted.current || !saved) return;
    greeted.current = true;
    const away = Date.now() - saved.lastUpdate > 36 * 60 * 60 * 1000;
    const p = current(saved);
    const t = setTimeout(() => say(away ? LINES.missed : moodOf(p) === 'hungry' ? LINES.hungry : LINES.hello), 400);
    return () => clearTimeout(t);
  }, [saved]);

  const burst = (emoji: string) => {
    const id = ++heartId.current;
    setHearts((h) => [...h, { id, emoji }]);
    setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 1400);
  };

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice((n) => (n === msg ? null : n)), 2500);
  };

  /** Play a little scene (eating, playing, twirling); calls `after` when it ends. */
  const playScene = (item: PetItem, after: () => void) => {
    const kind = sceneFor(item);
    busy.current = true;
    scroll.current?.scrollTo({ y: 0, animated: true });
    setLine(null);
    setScene({ id: Date.now(), kind, item });
    motion.play(kind);
    if (kind === 'eat') {
      setTimeout(() => setChewing(true), 600);
      setTimeout(() => setChewing(false), 1850);
    }
    setTimeout(() => {
      setScene(null);
      busy.current = false;
      after();
    }, SCENE_MS[kind]);
  };

  if (!pet) return <Adopt onClose={onClose} onAdopt={(name) => updatePet(() => newPet(name))} />;

  const mood = moodOf(pet);

  const claim = () => {
    updatePet((p) => (p ? { ...p, coins: p.coins + reward, lastRewardDate: todayKey() } : p));
    burst('🪙');
    say(LINES.awesome);
  };

  const pressItem = (item: PetItem) => {
    if (busy.current) return;
    setCulture(item.note ? `${item.emoji} ${item.zh} ${item.py} — ${item.note}` : null);
    const owned = pet.owned.includes(item.id);
    if (item.kind === 'food') {
      if (pet.hunger >= 95) return say(LINES.full);
      if (pet.coins < item.price) return flash(`You need ${item.price - pet.coins} more coins — reach your daily goal to earn more!`);
      updatePet((p) =>
        p ? { ...p, coins: p.coins - item.price, hunger: Math.min(100, p.hunger + (item.food ?? 0)), happiness: Math.min(100, p.happiness + (item.joy ?? 0)), feedCount: p.feedCount + 1 } : p,
      );
      playChinese(item.zh);
      playScene(item, () => {
        burst('❤️');
        say(item.id === 'bamboo' ? LINES.bamboo : Math.random() < 0.5 ? LINES.yummy : LINES.thanks);
      });
      return;
    }
    if (!owned) {
      if (pet.coins < item.price) return flash(`You need ${item.price - pet.coins} more coins — reach your daily goal to earn more!`);
      updatePet((p) =>
        p
          ? { ...p, coins: p.coins - item.price, owned: [...p.owned, item.id], wearing: item.kind === 'outfit' ? wearItem(p.wearing, item) : p.wearing }
          : p,
      );
      playChinese(item.zh);
      if (item.kind === 'outfit') {
        playScene(item, () => say(LINES.pretty));
        return;
      }
      flash(`You bought the ${item.en}! Tap it any time to play.`);
    }
    if (item.kind === 'toy') {
      // Playing cheers the panda up but makes it a little hungry.
      updatePet((p) => (p ? { ...p, happiness: Math.min(100, p.happiness + (item.joy ?? 0)), hunger: Math.max(0, p.hunger - 5) } : p));
      if (owned) playChinese(item.zh);
      playScene(item, () => {
        burst('💕');
        say(LINES.fun);
      });
      return;
    }
    // outfit: put on / take off
    const wearing = pet.wearing.includes(item.id);
    updatePet((p) => (p ? { ...p, wearing: wearing ? p.wearing.filter((w) => w !== item.id) : wearItem(p.wearing, item) } : p));
    playChinese(item.zh);
    if (!wearing) playScene(item, () => say(LINES.pretty));
  };

  const pat = () => {
    burst('💕');
    updatePet((p) => (p ? { ...p, happiness: Math.min(100, p.happiness + 2) } : p));
    say(chatLine(pet, goalReached));
  };

  return (
    <ScrollView ref={scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.back}>← Home</Text>
          </Pressable>
        ) : (
          <Text style={styles.tabTitle}>🐼 My Panda</Text>
        )}
        <View style={styles.coins}>
          <Text style={styles.coinsText}>🪙 {pet.coins}</Text>
        </View>
      </View>

      <Text style={styles.name}>{pet.name}</Text>
      <Text style={styles.mood}>
        熊猫 xióngmāo · {MOOD_TEXT[mood]}
      </Text>

      <View style={styles.stage}>
        {line && (
          <Pressable onPress={() => playChinese(line.zh)} style={styles.bubble}>
            <Text style={styles.bubbleZh}>{line.zh} 🔊</Text>
            <Text style={styles.bubblePy}>{line.py}</Text>
            <Text style={styles.bubbleEn}>{line.en}</Text>
          </Pressable>
        )}
        <View style={{ width: 210, height: 210 }}>
          <Animated.View style={motion.style}>
            <Panda mood={mood} wearing={pet.wearing} size={210} onPress={scene ? undefined : pat} chewing={chewing} bounce={!scene} />
          </Animated.View>
          {scene && <SceneItem key={scene.id} scene={scene} size={210} />}
        </View>
        {hearts.map((h) => (
          <FloatUp key={h.id} emoji={h.emoji} />
        ))}
        <Text style={styles.tapHint}>Tap {pet.name} to chat</Text>
      </View>

      <Card style={styles.block}>
        <Meter label="饱 Full" value={pet.hunger} color={pet.hunger < 25 ? colors.wrong : colors.gold} />
        <Meter label="开心 Happy" value={pet.happiness} color={pet.happiness < 30 ? colors.wrong : colors.jade} />
      </Card>

      {rewardReady ? (
        <Pressable onPress={claim}>
          <Card style={[styles.block, styles.rewardCard]}>
            <Text style={styles.rewardEmoji}>🎁</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rewardTitle}>Daily goal reached!</Text>
              <Text style={styles.rewardSub}>
                Tap to claim {reward} coins{progress.streak > 0 ? ` (includes 🔥 ${progress.streak}-day streak bonus)` : ''}
              </Text>
            </View>
          </Card>
        </Pressable>
      ) : (
        <Card style={[styles.block, styles.infoCard]}>
          <Text style={styles.infoText}>
            {goalReached
              ? '✅ Today’s coins collected. Come back tomorrow for more!'
              : `🎯 Reach your daily goal (${Math.min(progress.xpToday, dailyGoal)}/${dailyGoal} XP) to earn ${reward} coins.`}
          </Text>
        </Card>
      )}

      {notice && <Text style={styles.notice}>{notice}</Text>}
      {culture && <Text style={styles.cultureNote}>{culture}</Text>}

      <Text style={styles.shopTitle}>Shop · 商店 shāngdiàn</Text>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.grid}>
        {SHOP.filter((i) => (i.tab ?? i.kind) === tab).map((item) => {
          const owned = pet.owned.includes(item.id);
          const wearing = pet.wearing.includes(item.id);
          const tag =
            item.kind === 'food' ? `🪙 ${item.price}` : !owned ? `🪙 ${item.price}` : item.kind === 'toy' ? 'Play' : wearing ? 'Take off' : 'Wear';
          const cantAfford = !owned && pet.coins < item.price;
          return (
            <Pressable key={item.id} onPress={() => pressItem(item)} style={({ pressed }) => [styles.item, wearing && styles.itemOn, { opacity: pressed ? 0.7 : 1 }]}>
              <ItemArt id={item.id} emoji={item.emoji} size={52} />
              <Text style={styles.itemZh}>{item.zh}</Text>
              <Text style={styles.itemPy}>{item.py}</Text>
              <Text style={styles.itemEn}>{item.en}</Text>
              <View style={[styles.price, owned && item.kind !== 'food' && styles.priceOwned, cantAfford && styles.priceNo]}>
                <Text style={[styles.priceText, owned && item.kind !== 'food' && { color: '#fff' }]}>{tag}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.footer}>
        {tab === 'food' ? 'Food fills your panda up.' : tab === 'toy' ? 'Buy a toy once, then play any time.' : 'Buy once, then put it on or take it off.'} Tap a word in the bubble to hear it again.
      </Text>
    </ScrollView>
  );
}

function Adopt({ onClose, onAdopt }: { onClose?: () => void; onAdopt: (name: string) => void }) {
  const [name, setName] = useState('');
  const ok = name.trim().length > 0;
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {onClose && (
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={styles.back}>← Home</Text>
        </Pressable>
      )}
      <Text style={[styles.name, { marginTop: 10 }]}>Adopt a panda!</Text>
      <Text style={styles.mood}>熊猫 xióngmāo · panda</Text>
      <View style={styles.stage}>
        <Panda mood="happy" size={200} onPress={() => playChinese('熊猫')} />
      </View>
      <Card style={styles.block}>
        <Text style={styles.cardTitle}>How it works</Text>
        <Text style={styles.how}>🎯 Reach your daily XP goal → earn coins 🪙</Text>
        <Text style={styles.how}>🎋 Spend coins on food, toys and outfits</Text>
        <Text style={styles.how}>🐼 Your panda gets hungry if you stay away — come back every day!</Text>
        <Text style={styles.how}>🗣️ Everything is labeled in Chinese, so you learn while you play</Text>
      </Card>
      <Card style={styles.block}>
        <Text style={styles.cardTitle}>Give your panda a name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Type a name…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          maxLength={16}
          returnKeyType="done"
        />
        <Text style={[styles.muted, { marginTop: 10 }]}>Or pick a Chinese name:</Text>
        <View style={styles.chips}>
          {NAME_IDEAS.map((n) => (
            <Pressable
              key={n.zh}
              onPress={() => {
                setName(n.zh);
                playChinese(n.zh);
              }}
              style={[styles.chip, name === n.zh && styles.chipOn]}
            >
              <Text style={styles.chipZh}>{n.zh}</Text>
              <Text style={styles.chipEn}>
                {n.py} · {n.en}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button title={`Adopt · get ${START_COINS} free coins`} onPress={() => onAdopt(name.trim())} disabled={!ok} style={{ marginTop: 14 }} />
      </Card>
    </ScrollView>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ marginVertical: 5 }}>
      <View style={styles.meterRow}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={styles.muted}>{Math.round(value)}%</Text>
      </View>
      <ProgressBar value={value / 100} color={color} height={10} />
    </View>
  );
}

function FloatUp({ emoji }: { emoji: string }) {
  const v = useRef(new Animated.Value(0)).current;
  const x = useRef((Math.random() - 0.5) * 120).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [v]);
  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        styles.float,
        {
          opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
          transform: [{ translateX: x }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -140] }) }, { scale: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.5, 1.2, 1] }) }],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tabTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  back: { fontSize: 16, fontWeight: '700', color: colors.red },
  coins: { backgroundColor: colors.goldSoft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  coinsText: { fontSize: 17, fontWeight: '800', color: colors.ink },
  name: { fontSize: 30, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: 6 },
  mood: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 2 },
  stage: { zIndex: 5, alignItems: 'center', justifyContent: 'flex-end', minHeight: 250, marginTop: 8 },
  bubble: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 2, borderColor: colors.line, alignItems: 'center', marginBottom: 4, maxWidth: '90%' },
  bubbleZh: { fontSize: 20, color: colors.ink, fontWeight: '600' },
  bubblePy: { fontSize: 13, color: colors.red, fontWeight: '700' },
  bubbleEn: { fontSize: 13, color: colors.muted },
  tapHint: { fontSize: 12, color: colors.muted, marginTop: 2 },
  float: { position: 'absolute', bottom: 120, fontSize: 30 },
  block: { marginTop: 14 },
  meterRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  meterLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 13, color: colors.muted },
  rewardCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.gold },
  rewardEmoji: { fontSize: 34 },
  rewardTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  rewardSub: { fontSize: 13, color: '#fff', marginTop: 2 },
  infoCard: { backgroundColor: colors.goldSoft },
  infoText: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  cultureNote: { marginTop: 10, fontSize: 14, color: colors.ink, backgroundColor: colors.goldSoft, borderRadius: 10, padding: 10, textAlign: 'center', overflow: 'hidden' },
  notice: { marginTop: 10, fontSize: 14, color: colors.wrong, textAlign: 'center', fontWeight: '600' },
  shopTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 22 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 10 },
  tab: { flex: 1, paddingHorizontal: 4, paddingVertical: 9, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  tabActive: { backgroundColor: colors.red, borderColor: colors.red },
  tabText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  tabTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  item: { width: '31%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 10, alignItems: 'center', borderWidth: 2, borderColor: colors.line },
  itemOn: { borderColor: colors.jade, backgroundColor: colors.jadeSoft },
  itemEmoji: { fontSize: 32 },
  itemZh: { fontSize: 18, color: colors.ink, marginTop: 4 },
  itemPy: { fontSize: 12, color: colors.red, fontWeight: '700' },
  itemEn: { fontSize: 12, color: colors.muted },
  price: { marginTop: 6, backgroundColor: colors.goldSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  priceOwned: { backgroundColor: colors.jade },
  priceNo: { opacity: 0.5 },
  priceText: { fontSize: 13, fontWeight: '800', color: colors.ink },
  footer: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 14 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  how: { fontSize: 14, color: colors.ink, lineHeight: 22 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 12, fontSize: 18, color: colors.ink, marginTop: 4, backgroundColor: colors.bg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.card },
  chipOn: { borderColor: colors.red, backgroundColor: colors.redSoft },
  chipZh: { fontSize: 18, color: colors.ink },
  chipEn: { fontSize: 11, color: colors.muted },
});
