import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, ProgressBar, SpeakButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import GoalPicker from '../components/GoalPicker';
import { todayKey, useProgress } from '../context/ProgressContext';
import { allWords, lessons } from '../data/lessons';
import { scenarios } from '../data/conversations';
import { pictographs } from '../data/pictographs';
import { stories } from '../data/stories';
import { storyForYou } from '../stories/storyLogic';
import { weekStats } from '../services/weekStats';
import { colors, radius } from '../theme';
import { GearIcon } from '../components/icons';
import PetHero from '../pet/PetHero';
import ItemArt from '../pet/ItemArt';
import { current, moodOf } from '../pet/petLogic';

/** The tabs a tile can jump to. Home and the panda have their own buttons. */
type JumpTab = 'learn' | 'stories' | 'talk' | 'pictures' | 'quiz';

function wordOfTheDay() {
  const key = todayKey();
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return allWords[hash % allWords.length];
}

/**
 * Home: the panda, three numbers, the one thing to do next, and a grid with
 * every part of the app on it.
 *
 * The grid is deliberately complete — each tile carries a line of live state
 * ("6 due", "hungry", "3/7 days") so one glance says both what is here and
 * what is waiting.
 */
export default function HomeScreen({
  onOpenLesson,
  onOpenTab,
  onStartReview,
  onOpenPet,
  onOpenSettings,
  onOpenReport,
}: {
  onOpenLesson: (id: string) => void;
  onOpenTab: (tab: JumpTab) => void;
  onStartReview: () => void;
  onOpenPet: () => void;
  onOpenSettings: () => void;
  onOpenReport: () => void;
}) {
  const { progress, dueWordIds, dailyGoal } = useProgress();
  const [goalPickerOpen, setGoalPickerOpen] = useState(false);
  const { user } = useAuth();
  const word = wordOfTheDay();
  const startIndex = Math.max(0, lessons.findIndex((l) => l.id === user?.startLessonId));
  const nextLesson =
    lessons.slice(startIndex).find((l) => l.words.some((w) => !progress.learned.includes(w.id))) ??
    lessons.find((l) => l.words.some((w) => !progress.learned.includes(w.id))) ??
    lessons[startIndex];
  const nextDone = nextLesson.words.filter((w) => progress.learned.includes(w.id)).length;
  const goalReached = progress.xpToday >= dailyGoal;
  const week = weekStats(progress, allWords);

  const pet = progress.pet ? current(progress.pet) : undefined;
  const petMood = pet ? moodOf(pet) : undefined;
  const rewardWaiting = pet ? goalReached && pet.lastRewardDate !== todayKey() : false;
  const petBadge = !pet
    ? 'adopt one'
    : rewardWaiting
      ? 'gift waiting'
      : petMood === 'hungry'
        ? 'hungry'
        : petMood === 'sad'
          ? 'wants to play'
          : 'happy';

  const storiesRead = (progress.storiesRead ?? []).length;
  const pick = storyForYou(stories, progress);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>你好, {user?.name}! 👋</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {user?.level ? `Level: ${user.level}` : 'Let’s learn some Chinese today.'}
          </Text>
        </View>
        <Pressable
          onPress={onOpenSettings}
          accessibilityLabel="Settings"
          hitSlop={8}
          style={({ pressed }) => [styles.gear, pressed && { backgroundColor: colors.redSoft }]}
        >
          <GearIcon size={24} />
        </Pressable>
      </View>

      <PetHero onOpen={onOpenPet} />

      {/* One strip in place of three stat cards and the old daily-goal card. */}
      <Pressable onPress={() => setGoalPickerOpen(true)} accessibilityLabel="Change daily goal">
        <Card style={styles.strip}>
          <View style={styles.stripRow}>
            <StripItem emoji="🔥" value={`${progress.streak}`} label="day streak" />
            <View style={styles.stripLine} />
            <StripItem emoji="⭐" value={`${progress.xpToday}/${dailyGoal}`} label="XP today" />
            <View style={styles.stripLine} />
            <StripItem emoji="📚" value={`${progress.learned.length}`} label={`of ${allWords.length} words`} />
          </View>
          <ProgressBar
            value={progress.xpToday / dailyGoal}
            color={goalReached ? colors.jade : colors.gold}
            height={8}
          />
          <View style={styles.stripFoot}>
            <Text style={styles.muted}>
              {goalReached ? 'Daily goal reached — great work! 🎉' : `${dailyGoal - progress.xpToday} XP to go today`}
            </Text>
            <Text style={styles.changeGoal}>Change ✏️</Text>
          </View>
        </Card>
      </Pressable>
      <GoalPicker visible={goalPickerOpen} onClose={() => setGoalPickerOpen(false)} />

      {/* The one thing to do next. The only full-width card with a loud colour. */}
      <Pressable onPress={() => onOpenLesson(nextLesson.id)}>
        <Card style={[styles.block, styles.continueCard]}>
          <Text style={styles.continueLabel}>CONTINUE LEARNING</Text>
          <View style={styles.continueRow}>
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

      <Pressable onPress={onOpenReport}>
        <Card style={[styles.block, styles.weekCard]}>
          <View style={styles.weekTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.weekLabel}>📊 YOUR WEEK</Text>
              <Text style={styles.weekHeadline}>
                {week.daysActive} of 7 days · {week.xpThisWeek} XP
              </Text>
              <Text style={styles.weekSub}>How much XP you earned each day</Text>
            </View>
            <Text style={styles.weekArrow}>→</Text>
          </View>

          <WeekChart days={week.dailyXp} />

          <View style={styles.weekFoot}>
            <Text style={styles.weekFootItem}>
              <Text style={styles.weekFootNum}>{week.newWordsThisWeek}</Text> new words
            </Text>
            <Text style={styles.weekFootItem}>
              <Text style={styles.weekFootNum}>{week.accuracy === null ? '—' : `${week.accuracy}%`}</Text> correct
            </Text>
            <Text style={styles.weekFootItem}>
              <Text style={styles.weekFootNum}>{week.shakyCount}</Text> need work
            </Text>
          </View>
        </Card>
      </Pressable>

      <Text style={styles.sectionLabel}>EVERYTHING</Text>
      {/* One row for the whole app, ordered by what gets opened most. */}
      <Row>
        <Tile
          emoji="🧠"
          label="Review"
          badge={dueWordIds.length > 0 ? `${dueWordIds.length} due` : 'all done'}
          tint={colors.jadeSoft}
          highlight={dueWordIds.length > 0}
          onPress={onStartReview}
        />
        <Tile
          emoji="📖"
          art="tab_learn"
          label="Lessons"
          badge={`${progress.completedLessons.length}/${lessons.length}`}
          tint={colors.redSoft}
          onPress={() => onOpenTab('learn')}
        />
        <Tile
          emoji="✏️"
          art="tab_quiz"
          label="Quiz"
          badge={progress.bestQuizScore > 0 ? `best ${progress.bestQuizScore}%` : 'try one'}
          tint={colors.redSoft}
          onPress={() => onOpenTab('quiz')}
        />
        <Tile
          emoji="📚"
          art="tab_stories"
          label="Stories"
          badge={pick ? '⭐ new pick' : `${storiesRead}/${stories.length} read`}
          tint={colors.goldSoft}
          highlight={!!pick}
          onPress={() => onOpenTab('stories')}
        />
        <Tile
          emoji="💬"
          art="tab_talk"
          label="Talk"
          badge={`${scenarios.length} chats`}
          tint={colors.jadeSoft}
          onPress={() => onOpenTab('talk')}
        />
        <Tile
          emoji="🖼️"
          art="tab_pictures"
          label="Pictures"
          badge={`${pictographs.length} to spot`}
          tint={colors.goldSoft}
          onPress={() => onOpenTab('pictures')}
        />
        <Tile emoji="🐼" label="Panda" badge={petBadge} tint={colors.jadeSoft} highlight={rewardWaiting} onPress={onOpenPet} />
      </Row>

      <Card style={styles.wotd}>
        <View style={{ flex: 1 }}>
          <Text style={styles.wotdLabel}>WORD OF THE DAY</Text>
          <Text style={styles.wotdHanzi}>
            {word.hanzi} <Text style={styles.wotdPinyin}>{word.pinyin}</Text>
          </Text>
          <Text style={styles.muted}>{word.english}</Text>
        </View>
        <SpeakButton text={word.hanzi} size={48} />
      </Card>
    </ScrollView>
  );
}

/** A row of tiles that scrolls sideways and runs off both edges of the screen. */
function Row({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.rowBleed}
      contentContainerStyle={styles.rowInner}
    >
      {children}
    </ScrollView>
  );
}

/** Seven bars, one per day, tallest being the best day of the week. */
function WeekChart({ days }: { days: { date: string; letter: string; xp: number; today: boolean }[] }) {
  const most = Math.max(...days.map((d) => d.xp), 1);
  return (
    <View style={styles.chart}>
      {days.map((d) => (
        <View key={d.date} style={styles.chartCol}>
          <View style={styles.chartTrack}>
            <View
              style={[
                styles.chartBar,
                { height: Math.max(3, Math.round((d.xp / most) * 46)) },
                d.today && { backgroundColor: colors.red },
                d.xp === 0 && styles.chartBarEmpty,
              ]}
            />
          </View>
          <Text style={[styles.chartDay, d.today && styles.chartDayToday]} numberOfLines={1}>
            {d.today ? 'today' : d.letter}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** One of the three numbers in the strip under the panda. */
function StripItem({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={styles.stripItem}>
      <Text style={styles.stripValue}>
        {emoji} {value}
      </Text>
      <Text style={styles.stripLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * One square in the grid. `art` picks the app's own drawing when there is one
 * for that part of the app; otherwise the emoji stands in.
 */
function Tile({
  emoji,
  art,
  label,
  badge,
  tint,
  highlight,
  onPress,
}: {
  emoji: string;
  art?: string;
  label: string;
  badge: string;
  tint: string;
  highlight?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`${label}, ${badge}`}
      style={({ pressed }) => [styles.tile, highlight && styles.tileOn, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.tileIcon, { backgroundColor: tint }]}>
        {art ? <ItemArt id={art} emoji={emoji} size={28} animate={false} /> : <Text style={styles.tileEmoji}>{emoji}</Text>}
      </View>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.tileBadge, highlight && styles.tileBadgeOn]} numberOfLines={1}>
        {badge}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  hello: { fontSize: 28, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 16, color: colors.muted, marginTop: 2, marginBottom: 12 },
  gear: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginTop: 2 },

  strip: { marginTop: 12, paddingVertical: 12 },
  stripRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stripItem: { flex: 1, alignItems: 'center' },
  stripLine: { width: 1, height: 28, backgroundColor: colors.line },
  stripValue: { fontSize: 17, fontWeight: '800', color: colors.ink },
  stripLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  stripFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  muted: { fontSize: 13, color: colors.muted },
  changeGoal: { fontSize: 13, fontWeight: '800', color: colors.red, marginLeft: 10 },

  block: { marginTop: 12 },
  continueCard: { backgroundColor: colors.red },
  continueLabel: { color: '#FFD9D4', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  continueRow: { flexDirection: 'row', alignItems: 'center' },
  continueTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  continueSub: { color: '#FFE9E6', fontSize: 14, marginTop: 4 },
  arrow: { color: '#fff', fontSize: 28, fontWeight: '700', marginLeft: 12 },

  sectionLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginTop: 14, marginBottom: 7 },
  rowBleed: { marginHorizontal: -20 },
  rowInner: { paddingHorizontal: 20, gap: 8 },
  tile: {
    width: 100,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 5,
  },
  tileOn: { borderColor: colors.gold, borderWidth: 2 },
  tileIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  tileEmoji: { fontSize: 24 },
  tileLabel: { fontSize: 13, fontWeight: '800', color: colors.ink },
  tileBadge: { fontSize: 11, color: colors.muted },
  tileBadgeOn: { color: '#9A6B00', fontWeight: '800' },

  weekCard: { backgroundColor: colors.goldSoft, borderWidth: 2, borderColor: colors.gold },
  weekTop: { flexDirection: 'row', alignItems: 'center' },
  weekLabel: { fontSize: 11, fontWeight: '800', color: '#9A6B00', letterSpacing: 1 },
  weekHeadline: { fontSize: 21, fontWeight: '800', color: colors.ink, marginTop: 3 },
  weekSub: { fontSize: 12, color: '#9A6B00', marginTop: 3 },
  weekArrow: { fontSize: 24, fontWeight: '700', color: '#9A6B00', marginLeft: 12 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 12 },
  chartCol: { flex: 1, minWidth: 0, alignItems: 'center', gap: 5 },
  chartTrack: { height: 46, justifyContent: 'flex-end', alignSelf: 'stretch' },
  chartBar: { width: 20, alignSelf: 'center', borderRadius: 5, backgroundColor: colors.gold },
  chartBarEmpty: { backgroundColor: '#E8DCC2' },
  chartDay: { fontSize: 10, color: colors.muted, fontWeight: '700' },
  chartDayToday: { color: colors.red, fontWeight: '800' },
  weekFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, gap: 8 },
  weekFootItem: { fontSize: 12, color: colors.muted },
  weekFootNum: { fontSize: 14, fontWeight: '800', color: colors.ink },

  wotd: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  wotdLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.5 },
  wotdHanzi: { fontSize: 30, color: colors.ink, fontWeight: '600', marginTop: 4 },
  wotdPinyin: { fontSize: 17, color: colors.red, fontWeight: '600' },
});
