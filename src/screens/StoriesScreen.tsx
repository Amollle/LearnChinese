import type { ScrollViewInstance } from 'react-native';
import React, { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card } from '../components/ui';
import { useProgress } from '../context/ProgressContext';
import { Story, StorySentence, StoryToken, stories } from '../data/stories';
import ItemArt from '../pet/ItemArt';
import PetBuddy, { petReact } from '../pet/PetBuddy';
import { playChinese } from '../services/audio';
import { knowsToken, learnedHanzi, lessonFor, levelName, recommendedLevel, storyCoverage } from '../stories/storyLogic';
import { colors, radius } from '../theme';

const STORY_XP = 15;
const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
/** Remembers which chapter each book is open at, while the app is running. */
const chapterOf: Record<string, number> = {};

/** The Stories tab: a shelf of books, and the reader. `storyId` null = the shelf. */
export default function StoriesScreen({
  storyId,
  onOpenStory,
  onOpenLesson,
}: {
  storyId: string | null;
  onOpenStory: (id: string | null) => void;
  onOpenLesson: (lessonId: string) => void;
}) {
  const story = stories.find((s) => s.id === storyId);
  if (story) return <Reader key={story.id} story={story} onBack={() => onOpenStory(null)} onOpenLesson={onOpenLesson} />;
  return <Shelf onOpen={onOpenStory} />;
}

/* ---------- the bookshelf ---------- */

function Shelf({ onOpen }: { onOpen: (id: string) => void }) {
  const { progress } = useProgress();
  const rec = recommendedLevel(progress);
  const learned = useMemo(() => learnedHanzi(progress), [progress]);
  const read = progress.storiesRead ?? [];
  const order = [1, 2, 3];

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Stories</Text>
        <PetBuddy size={56} />
      </View>
      <Card style={styles.levelCard}>
        <Text style={styles.levelTitle}>⭐ Recommended for you: {levelName(rec)} books</Text>
        <Text style={styles.levelSub}>Picked from the lessons you've finished — but you can read any book at any level. Books open as plain text — tap “Study tools” any time for pinyin, audio and word meanings.</Text>
      </Card>

      {order.map((lvl) => (
        <View key={lvl}>
          <Text style={styles.section}>
            LEVEL {lvl} · {levelName(lvl).toUpperCase()}
            {lvl === rec ? '  ⭐ RECOMMENDED FOR YOU' : ''}
          </Text>
          {stories
            .filter((s) => s.level === lvl)
            .map((s) => {
              const starred = s.level === rec;
              const pct = Math.round(storyCoverage(s, learned) * 100);
              const done = read.includes(s.id);
              const at = chapterOf[s.id];
              return (
                <Pressable key={s.id} onPress={() => onOpen(s.id)}>
                  {({ pressed }) => (
                    <Card style={[styles.bookCard, starred && styles.bookCardGood, pressed && { opacity: 0.85 }]}>
                      <View style={styles.cover}>
                        <ItemArt id={s.art} size={52} animate={false} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bookTitle}>{s.title}</Text>
                        <Text style={styles.bookEn}>{s.titleEn}</Text>
                        <Text style={styles.blurb}>{s.blurb}</Text>
                        <View style={styles.badges}>
                          <Text style={[styles.badge, starred ? styles.badgeGood : styles.badgeLevel]}>
                            {starred ? '⭐ ' : ''}
                            {levelName(s.level)}
                          </Text>
                          <Text style={styles.meta}>
                            {s.chapters.length} chapters · you know {pct}% of the words
                            {done ? ' · ✓ Finished' : at !== undefined ? ` · reading chapter ${at + 1}` : ''}
                          </Text>
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

/* ---------- reading a book ---------- */

function Reader({ story, onBack, onOpenLesson }: { story: Story; onBack: () => void; onOpenLesson: (lessonId: string) => void }) {
  const { progress, markStoryRead } = useProgress();
  const [chapter, setChapter] = useState(chapterOf[story.id] ?? 0);
  const [study, setStudy] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);
  const [shownEn, setShownEn] = useState<Record<string, boolean>>({});
  const [picked, setPicked] = useState<{ token: StoryToken; sentence: StorySentence } | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [earned, setEarned] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const learned = useMemo(() => learnedHanzi(progress), [progress]);
  const ch = story.chapters[chapter];
  const last = chapter === story.chapters.length - 1;
  const allAnswered = story.quiz.every((_, i) => answers[i] !== undefined);
  const right = story.quiz.filter((q, i) => answers[i] === q.answer).length;

  const goChapter = (n: number) => {
    chapterOf[story.id] = n;
    setChapter(n);
    setTimeout(() => scroll.current?.scrollTo({ y: 0, animated: false }), 0);
  };

  const answer = (qi: number, oi: number) => {
    if (answers[qi] !== undefined) return;
    const next = { ...answers, [qi]: oi };
    setAnswers(next);
    petReact(oi === story.quiz[qi].answer ? 'right' : 'wrong');
    if (story.quiz.every((_, i) => next[i] !== undefined)) {
      setEarned(!(progress.storiesRead ?? []).includes(story.id));
      markStoryRead(story.id, STORY_XP);
      setTimeout(() => petReact('done'), 700);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ Books</Text>
        </Pressable>
        <Pressable onPress={() => setStudy((s) => !s)} style={[styles.studyBtn, study && styles.studyBtnOn]}>
          <Text style={[styles.studyText, study && { color: '#fff' }]}>{study ? '📖 Just read' : '✨ Study tools'}</Text>
        </Pressable>
        <PetBuddy size={40} />
      </View>
      {study && (
        <View style={styles.studyBar}>
          <Text style={styles.studyHint}>Tap any word for its meaning</Text>
          <View style={styles.toggle}>
            <Text style={styles.toggleText}>Pinyin</Text>
            <Switch value={showPinyin} onValueChange={setShowPinyin} trackColor={{ true: colors.red }} />
          </View>
        </View>
      )}

      <ScrollView ref={scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {chapter === 0 && (
          <View style={styles.bookHead}>
            <ItemArt id={story.art} size={70} />
            <Text style={styles.readerTitle}>{story.title}</Text>
            {study && <Text style={styles.readerSub}>{story.titlePy} · {story.titleEn}</Text>}
          </View>
        )}
        <Text style={styles.chapterLabel}>
          第{CN_NUM[chapter]}章 {study ? `· Chapter ${chapter + 1} of ${story.chapters.length}` : ''}
        </Text>
        <Text style={styles.chapterTitle}>{ch.title}</Text>
        {study && (
          <Text style={styles.readerSub}>
            {ch.titlePy} · {ch.titleEn}
          </Text>
        )}

        {!study ? (
          // plain book page: just the words
          <View style={styles.page}>
            {ch.paragraphs.map((p, pi) => (
              <Text key={pi} style={styles.pageText}>
                {'　　'}
                {p.map((s) => s.zh).join('')}
              </Text>
            ))}
          </View>
        ) : (
          ch.paragraphs.map((p, pi) => (
            <View key={pi} style={styles.studyPara}>
              {p.map((s, si) => {
                const key = `${pi}-${si}`;
                return (
                  <View key={key} style={styles.sentence}>
                    <View style={styles.tokens}>
                      {s.t.map((t, j) =>
                        t.py ? (
                          <Pressable key={j} onPress={() => setPicked({ token: t, sentence: s })} style={({ pressed }) => [styles.token, pressed && styles.tokenPressed]}>
                            {showPinyin && <Text style={styles.tokPy}>{t.py}</Text>}
                            <Text style={[styles.tokZh, !knowsToken(t.zh, learned) && styles.tokNew]}>{t.zh}</Text>
                          </Pressable>
                        ) : (
                          <View key={j} style={styles.token}>
                            {showPinyin && <Text style={styles.tokPy}> </Text>}
                            <Text style={styles.tokZh}>{t.zh}</Text>
                          </View>
                        ),
                      )}
                    </View>
                    <View style={styles.sentenceTools}>
                      <Pressable onPress={() => playChinese(s.zh)} hitSlop={6} style={styles.tool}>
                        <Text style={styles.toolText}>🔊</Text>
                      </Pressable>
                      <Pressable onPress={() => setShownEn((m) => ({ ...m, [`${chapter}-${key}`]: !m[`${chapter}-${key}`] }))} hitSlop={6} style={[styles.tool, shownEn[`${chapter}-${key}`] && styles.toolOn]}>
                        <Text style={[styles.toolText, shownEn[`${chapter}-${key}`] && { color: '#fff' }]}>EN</Text>
                      </Pressable>
                    </View>
                    {shownEn[`${chapter}-${key}`] && <Text style={styles.translation}>{s.en}</Text>}
                  </View>
                );
              })}
            </View>
          ))
        )}

        <View style={styles.chapterNav}>
          {chapter > 0 ? <Button title="← Previous" variant="secondary" onPress={() => goChapter(chapter - 1)} style={{ flex: 1 }} /> : <View style={{ flex: 1 }} />}
          {!last && <Button title="Next chapter →" onPress={() => goChapter(chapter + 1)} style={{ flex: 1 }} />}
        </View>

        {last && (
          <>
            <Text style={styles.section}>THE END · 完 — CHECK YOUR UNDERSTANDING</Text>
            {story.quiz.map((q, qi) => (
              <Card key={qi} style={styles.quizCard}>
                <Text style={styles.quizQ}>
                  {qi + 1}. {q.q}
                </Text>
                {q.options.map((o, oi) => {
                  const show = answers[qi] !== undefined;
                  const correct = oi === q.answer;
                  const chosen = answers[qi] === oi;
                  return (
                    <Pressable key={oi} onPress={() => answer(qi, oi)} style={[styles.option, show && correct && styles.optionRight, show && chosen && !correct && styles.optionWrong]}>
                      <Text style={styles.optionText}>
                        {show && correct ? '✓ ' : show && chosen ? '✕ ' : ''}
                        {o}
                      </Text>
                    </Pressable>
                  );
                })}
              </Card>
            ))}
            {allAnswered && (
              <Card style={styles.doneCard}>
                <Text style={styles.doneTitle}>
                  🎉 Book finished! {right}/{story.quiz.length} correct
                </Text>
                <Text style={styles.doneSub}>{earned ? `+${STORY_XP} XP` : 'You already earned XP for this book — reading again is great practice!'}</Text>
                <Button title="Back to the bookshelf" variant="success" onPress={onBack} style={{ marginTop: 10 }} />
              </Card>
            )}
          </>
        )}
      </ScrollView>

      <WordSheet
        picked={picked}
        learned={learned}
        learnedIds={progress.learned}
        onClose={() => setPicked(null)}
        onOpenLesson={(id) => {
          setPicked(null);
          onOpenLesson(id);
        }}
      />
    </View>
  );
}

/* ---------- the word pop-up ---------- */

function WordSheet({
  picked,
  learned,
  learnedIds,
  onClose,
  onOpenLesson,
}: {
  picked: { token: StoryToken; sentence: StorySentence } | null;
  learned: string[];
  learnedIds: string[];
  onClose: () => void;
  onOpenLesson: (lessonId: string) => void;
}) {
  const token = picked?.token;
  const hint = token ? lessonFor(token.zh) : null;
  const known = token ? knowsToken(token.zh, learned) : false;
  return (
    <Modal visible={!!picked} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          {token && (
            <>
              <View style={styles.wordRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wordZh}>{token.zh}</Text>
                  <Text style={styles.wordPy}>{token.py}</Text>
                </View>
                <Pressable onPress={() => playChinese(token.zh)} style={styles.speak} hitSlop={8}>
                  <Text style={{ fontSize: 24 }}>🔊</Text>
                </Pressable>
              </View>
              <Text style={styles.wordEn}>{token.en}</Text>
              {picked && (
                <View style={styles.context}>
                  <Text style={styles.contextLabel}>IN THIS STORY</Text>
                  <Text style={styles.contextZh}>{picked.sentence.zh}</Text>
                  <Text style={styles.contextEn}>{picked.sentence.en}</Text>
                </View>
              )}
              {hint && hint.kind !== 'none' ? (
                <View style={[styles.lessonBox, known && styles.lessonBoxKnown]}>
                  <Text style={styles.lessonText}>
                    {hint.kind === 'word'
                      ? learnedIds.includes(hint.word.id)
                        ? `✅ You learned this in ${hint.lesson.emoji} ${hint.lesson.title}.`
                        : `📘 Learn this word in the lesson ${hint.lesson.emoji} ${hint.lesson.title}.`
                      : `📘 ${hint.char} is in ${hint.word.hanzi} (${hint.word.english}) — lesson ${hint.lesson.emoji} ${hint.lesson.title}.`}
                  </Text>
                  <Button
                    title={hint.kind === 'word' && learnedIds.includes(hint.word.id) ? 'Review that lesson' : 'Go to the lesson →'}
                    variant={known ? 'secondary' : 'primary'}
                    onPress={() => onOpenLesson(hint.lesson.id)}
                    style={{ marginTop: 10 }}
                  />
                </View>
              ) : (
                <View style={styles.lessonBox}>
                  <Text style={styles.lessonText}>✨ This word isn't in a lesson yet — remember it from this story!</Text>
                </View>
              )}
              <Button title="Close" variant="secondary" onPress={onClose} style={{ marginTop: 12 }} />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 6, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 30, fontWeight: '800', color: colors.ink },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  back: { fontSize: 16, fontWeight: '700', color: colors.red, width: 70 },
  studyBtn: { borderWidth: 2, borderColor: colors.gold, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.goldSoft },
  studyBtnOn: { backgroundColor: colors.jade, borderColor: colors.jade },
  studyText: { fontSize: 14, fontWeight: '800', color: colors.ink },
  studyBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 6 },
  studyHint: { fontSize: 13, color: colors.muted },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  levelCard: { backgroundColor: colors.jadeSoft, marginTop: 8 },
  levelTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  levelSub: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 19 },
  section: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginTop: 22, marginBottom: 10 },
  bookCard: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  bookCardGood: { borderWidth: 2, borderColor: colors.gold },
  cover: { width: 70, height: 90, borderRadius: 8, backgroundColor: '#F7EEDC', alignItems: 'center', justifyContent: 'center', borderLeftWidth: 6, borderLeftColor: colors.red },
  bookTitle: { fontSize: 20, color: colors.ink, fontWeight: '700' },
  bookEn: { fontSize: 13, color: colors.muted, marginTop: 1 },
  blurb: { fontSize: 13, color: colors.ink, marginTop: 4, lineHeight: 18 },
  badges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badge: { fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  badgeGood: { backgroundColor: colors.goldSoft, color: '#9A6B00' },
  badgeLevel: { backgroundColor: colors.line, color: colors.ink },
  meta: { fontSize: 12, color: colors.muted },
  bookHead: { alignItems: 'center', marginTop: 4, marginBottom: 8 },
  readerTitle: { fontSize: 28, color: colors.ink, fontWeight: '700', marginTop: 6 },
  readerSub: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 2 },
  chapterLabel: { fontSize: 13, fontWeight: '800', color: colors.red, textAlign: 'center', marginTop: 14, letterSpacing: 1 },
  chapterTitle: { fontSize: 24, color: colors.ink, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  page: { backgroundColor: '#FFFCF5', borderRadius: radius.md, padding: 20, marginTop: 14, borderWidth: 1, borderColor: colors.line },
  pageText: { fontSize: 21, lineHeight: 38, color: colors.ink, marginBottom: 12 },
  studyPara: { marginTop: 14 },
  sentence: { backgroundColor: colors.card, borderRadius: radius.md, padding: 12, marginTop: 8 },
  tokens: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  token: { alignItems: 'center', paddingHorizontal: 2, paddingVertical: 2, borderRadius: 6 },
  tokenPressed: { backgroundColor: colors.goldSoft },
  tokPy: { fontSize: 11, color: colors.red, fontWeight: '600' },
  tokZh: { fontSize: 23, color: colors.ink },
  tokNew: { textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: colors.gold },
  sentenceTools: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tool: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3 },
  toolOn: { backgroundColor: colors.jade, borderColor: colors.jade },
  toolText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  translation: { fontSize: 14, color: colors.muted, marginTop: 8, fontStyle: 'italic' },
  chapterNav: { flexDirection: 'row', gap: 10, marginTop: 20 },
  quizCard: { marginBottom: 10 },
  quizQ: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  option: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 11, marginTop: 6 },
  optionRight: { backgroundColor: colors.jadeSoft, borderColor: colors.jade },
  optionWrong: { backgroundColor: colors.wrongSoft, borderColor: colors.wrong },
  optionText: { fontSize: 15, color: colors.ink },
  doneCard: { backgroundColor: colors.goldSoft, alignItems: 'center' },
  doneTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  doneSub: { fontSize: 14, color: colors.muted, marginTop: 4, textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(43,33,24,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 34 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 12 },
  wordRow: { flexDirection: 'row', alignItems: 'center' },
  wordZh: { fontSize: 40, color: colors.ink },
  wordPy: { fontSize: 18, color: colors.red, fontWeight: '700' },
  speak: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  wordEn: { fontSize: 18, color: colors.ink, fontWeight: '600', marginTop: 8 },
  context: { backgroundColor: colors.card, borderRadius: radius.sm, padding: 12, marginTop: 14 },
  contextLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 1 },
  contextZh: { fontSize: 17, color: colors.ink, marginTop: 4 },
  contextEn: { fontSize: 13, color: colors.muted, marginTop: 2 },
  lessonBox: { backgroundColor: colors.goldSoft, borderRadius: radius.sm, padding: 12, marginTop: 12 },
  lessonBoxKnown: { backgroundColor: colors.jadeSoft },
  lessonText: { fontSize: 14, color: colors.ink, lineHeight: 20 },
});
