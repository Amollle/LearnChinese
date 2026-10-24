import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ProgressProvider, todayKey, useProgress } from './src/context/ProgressContext';
import ItemArt from './src/pet/ItemArt';
import Panda from './src/pet/Panda';
import { current, moodOf } from './src/pet/petLogic';
import { SettingsProvider } from './src/context/SettingsContext';
import { lessons } from './src/data/lessons';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import ReviewScreen from './src/screens/ReviewScreen';
import TalkScreen from './src/screens/TalkScreen';
import PicturesScreen from './src/screens/PicturesScreen';
import PlacementScreen from './src/screens/PlacementScreen';
import LessonScreen from './src/screens/LessonScreen';
import LessonsScreen from './src/screens/LessonsScreen';
import QuizScreen from './src/screens/QuizScreen';
import PetScreen from './src/screens/PetScreen';
import StoriesScreen from './src/screens/StoriesScreen';
import { colors } from './src/theme';

type Tab = 'home' | 'learn' | 'stories' | 'pet' | 'talk' | 'pictures' | 'quiz';

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'learn', label: 'Learn', icon: '📖' },
  { key: 'stories', label: 'Stories', icon: '📚' },
  { key: 'pet', label: 'Panda', icon: '🐼' },
  { key: 'talk', label: 'Talk', icon: '💬' },
  { key: 'pictures', label: 'Pictures', icon: '🖼️' },
  { key: 'quiz', label: 'Quiz', icon: '✏️' },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

/** Decides what to show: login → placement quiz → the main app. */
function Gate() {
  const insets = useSafeAreaInsets();
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <View style={[styles.root, styles.loading]}>
        <ActivityIndicator color={colors.red} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar style="dark" />
        <AuthScreen />
      </View>
    );
  }

  // One progress provider for both the placement test and the main app,
  // so placement results are kept when the app switches over.
  return (
    <ProgressProvider key={user.id} userId={user.id}>
      {user.placementDone ? (
        <Main />
      ) : (
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <StatusBar style="dark" />
          <PlacementScreen />
        </View>
      )}
    </ProgressProvider>
  );
}

function Main() {
  const insets = useSafeAreaInsets();
  const { ready } = useProgress();
  const [tab, setTab] = useState<Tab>('home');
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [quizPreset, setQuizPreset] = useState<string | null>(null);
  // the open book in the Stories tab (null = the bookshelf)
  const [storyId, setStoryId] = useState<string | null>(null);
  const [talkOpen, setTalkOpen] = useState(false); // hide the tab bar during a conversation

  const openLesson = lessons.find((l) => l.id === openLessonId);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (reviewOpen) {
        setReviewOpen(false);
        return true;
      }
      if (openLessonId) {
        setOpenLessonId(null);
        return true;
      }
      if (tab !== 'home') {
        setTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [openLessonId, tab, reviewOpen]);

  if (!ready) {
    return (
      <View style={[styles.root, styles.loading]}>
        <ActivityIndicator color={colors.red} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, paddingBottom: openLesson || reviewOpen || (tab === 'talk' && talkOpen) ? insets.bottom : 0 }}>
        {reviewOpen ? (
          <ReviewScreen onClose={() => setReviewOpen(false)} />
        ) : openLesson ? (
          <LessonScreen
            lesson={openLesson}
            onClose={() => setOpenLessonId(null)}
            onQuiz={(id) => {
              setOpenLessonId(null);
              setQuizPreset(id);
              setTab('quiz');
            }}
          />
        ) : tab === 'home' ? (
          <HomeScreen
            onOpenLesson={setOpenLessonId}
            onStartQuiz={() => setTab('quiz')}
            onStartReview={() => setReviewOpen(true)}
            onOpenPet={() => setTab('pet')}
            onOpenStory={(id) => {
              setStoryId(id);
              setTab('stories');
            }}
          />
        ) : tab === 'learn' ? (
          <LessonsScreen onOpenLesson={setOpenLessonId} />
        ) : tab === 'stories' ? (
          <StoriesScreen storyId={storyId} onOpenStory={setStoryId} onOpenLesson={setOpenLessonId} />
        ) : tab === 'pet' ? (
          <PetScreen />
        ) : tab === 'talk' ? (
          <TalkScreen onOpenChange={setTalkOpen} />
        ) : tab === 'pictures' ? (
          <PicturesScreen />
        ) : (
          <QuizScreen presetLessonId={quizPreset} onPresetUsed={() => setQuizPreset(null)} />
        )}
      </View>

      {!openLesson && !reviewOpen && !(tab === 'talk' && talkOpen) && (
        <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {tabs.map((t) => {
            const active = t.key === tab;
            if (t.key === 'pet') return <PetTab key={t.key} active={active} onPress={() => setTab('pet')} />;
            return (
              <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
                <View style={{ opacity: active ? 1 : 0.55, transform: [{ scale: active ? 1.1 : 1 }] }}>
                  <ItemArt id={`tab_${t.key}`} emoji={t.icon} size={30} animate={active} />
                </View>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** The big raised panda button in the middle of the tab bar, with a red dot when the panda needs you. */
function PetTab({ active, onPress }: { active: boolean; onPress: () => void }) {
  const { progress, dailyGoal } = useProgress();
  const pet = progress.pet ? current(progress.pet) : undefined;
  const mood = pet ? moodOf(pet) : 'happy';
  const needsYou =
    !pet || mood === 'hungry' || mood === 'sad' || (progress.xpToday >= dailyGoal && pet.lastRewardDate !== todayKey());
  return (
    <Pressable style={styles.tab} onPress={onPress} accessibilityLabel="My panda">
      <View style={[styles.petBtn, active && styles.petBtnActive]}>
        <Panda mood={mood} wearing={pet?.wearing} size={50} bounce={!active} />
        {needsYou && <View style={styles.dot} />}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>Panda</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  petBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    marginTop: -30,
    backgroundColor: '#EAF5EF',
    borderWidth: 3,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2B2118',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  petBtnActive: { backgroundColor: colors.jade },
  dot: { position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.red, borderWidth: 2, borderColor: '#fff' },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  tabLabelActive: { color: colors.red, fontWeight: '800' },
});
