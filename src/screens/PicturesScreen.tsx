import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, onPhotoError, Photo, ProgressBar, SpeakButton, speakChinese } from '../components/ui';
import { useProgress } from '../context/ProgressContext';
import { PictureStyle, useSettings } from '../context/SettingsContext';
import { Pictograph, pictographGroups, pictographs } from '../data/pictographs';
import { colors, radius } from '../theme';
import { shuffle } from '../utils';

const GAME_LENGTH = 8;
const XP_PER_CORRECT = 10;

export default function PicturesScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const { pictureStyle, setPictureStyle } = useSettings();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => onPhotoError((err) => setPhotoError((prev) => prev ?? err)), []);

  if (playing) return <PictureGame onExit={() => setPlaying(false)} />;

  const open = openIndex !== null ? pictographs[openIndex] : null;

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Picture Characters</Text>
        <Text style={styles.subtitle}>
          Many Chinese characters started out as drawings of the things they mean. The oldest ones were carved on
          animal bones and shells about 3,000 years ago (甲骨文, “oracle bone script”).
        </Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show pictures as</Text>
          <View style={styles.toggle}>
            {([
              ['ancient', '🦴 Ancient'],
              ['photo', '📷 Photos'],
              ['emoji', '😀 Emoji'],
            ] as [PictureStyle, string][]).map(([value, text]) => {
              const active = pictureStyle === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setPictureStyle(value)}
                  style={[styles.toggleOption, active && styles.toggleOptionActive]}
                >
                  <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{text}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Card style={styles.explain}>
          <Text style={styles.explainTitle}>💡 How Chinese characters work</Text>
          <Explain icon="🖼️" title="Drawings" text="Simple sketches of real things — 山 looks like three mountain peaks." />
          <Explain icon="➕" title="Put together" text="Pictures combine into new ideas — 木 tree + 木 tree = 林 woods." />
          <Explain icon="🐾" title="Animals" text="Animals stand upright on their tails — 象 elephant still shows its trunk, 鹿 deer its antlers." />
          <Explain
            icon="🔊"
            title="Sound + meaning"
            text="Most characters mix a meaning part and a sound part. 妈 (mā, mom) = 女 woman (meaning) + 马 mǎ (sound)."
          />
          <Text style={styles.explainNote}>Learn the picture characters first — they appear inside thousands of other characters.</Text>
        </Card>

        <Pressable onPress={() => setPlaying(true)}>
          <Card style={styles.gameCard}>
            <Text style={{ fontSize: 30 }}>🧩</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.gameTitle}>Picture match game</Text>
              <Text style={styles.gameSub}>See the picture, pick the character</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </Card>
        </Pressable>

        {photoError && pictureStyle === 'photo' && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorTitle}>Some photos couldn't load</Text>
            <Text style={styles.errorText}>Check your internet connection and try again.</Text>
            <Text style={styles.errorDetail}>Details: {photoError}</Text>
            <Button
              title="Try again"
              variant="secondary"
              onPress={() => {
                setPhotoError(null);
                setReloadKey((k) => k + 1);
              }}
              style={{ marginTop: 10 }}
            />
          </Card>
        )}

        {pictographGroups.map((g) => (
          <View key={`${g.key}-${reloadKey}`}>
            <Text style={styles.section}>{g.title}</Text>
            <Text style={styles.sectionSub}>{g.subtitle}</Text>
            {pictographs.map((p, idx) =>
              p.group !== g.key ? null : (
                <Pressable key={p.hanzi} onPress={() => setOpenIndex(idx)}>
                  {({ pressed }) => (
                    <Card style={[styles.row, pressed && { opacity: 0.85 }]}>
                      <Photo id={p.photo} width={300} label={p.hanzi} hanzi={p.hanzi} emoji={p.emoji} emojiSize={40} style={styles.rowPhoto} />
                      <View style={{ flex: 1 }}>
                        <View style={styles.rowTop}>
                          <Text style={styles.rowHanzi}>{p.hanzi}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.rowPinyin}>{p.pinyin}</Text>
                            <Text style={styles.rowEnglish}>{p.english}</Text>
                          </View>
                          <SpeakButton text={p.hanzi} size={38} />
                        </View>
                        <Text style={styles.rowStory}>{p.story}</Text>
                      </View>
                    </Card>
                  )}
                </Pressable>
              ),
            )}
          </View>
        ))}

        <Text style={styles.credit}>Photos: Unsplash. Audio: neural Mandarin voice (sherpa-onnx, Biaobei voice) and some recordings from the audio-cmn project (Yue Tan & Chen Wang, CC BY-SA).</Text>
      </ScrollView>

      <Modal visible={open !== null} transparent animationType="fade" onRequestClose={() => setOpenIndex(null)}>
        <Pressable style={styles.backdrop} onPress={() => setOpenIndex(null)}>
          {open && openIndex !== null && (
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Photo id={open.photo} width={800} label={open.hanzi} hanzi={open.hanzi} emoji={open.emoji} emojiSize={90} style={styles.sheetPhoto} />
              <View style={styles.sheetBody}>
                {pictureStyle === 'ancient' && (
                  <Text style={styles.ancientCaption}>Ancient form, about 3,000 years ago ↓ today</Text>
                )}
                <Text style={styles.detailHanzi}>{open.hanzi}</Text>
                <Text style={styles.detailPinyin}>{open.pinyin}</Text>
                <Text style={styles.detailEnglish}>{open.english}</Text>
                <View style={styles.storyBox}>
                  <Text style={styles.story}>{open.story}</Text>
                </View>
                <SpeakButton text={open.hanzi} size={52} />
                <View style={styles.navRow}>
                  <Button
                    title="‹ Prev"
                    variant="secondary"
                    onPress={() => setOpenIndex((openIndex - 1 + pictographs.length) % pictographs.length)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Next ›"
                    variant="secondary"
                    onPress={() => setOpenIndex((openIndex + 1) % pictographs.length)}
                    style={{ flex: 1 }}
                  />
                </View>
                <Pressable onPress={() => setOpenIndex(null)} hitSlop={10} style={{ marginTop: 14 }}>
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </View>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

function Explain({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <View style={styles.explainRow}>
      <Text style={styles.explainIcon}>{icon}</Text>
      <Text style={styles.explainText}>
        <Text style={{ fontWeight: '800' }}>{title}: </Text>
        {text}
      </Text>
    </View>
  );
}

type GameQ = { answer: Pictograph; options: Pictograph[] };

function buildGame(): GameQ[] {
  return shuffle(pictographs)
    .slice(0, GAME_LENGTH)
    .map((answer) => ({
      answer,
      options: shuffle([answer, ...shuffle(pictographs.filter((p) => p.hanzi !== answer.hanzi)).slice(0, 3)]),
    }));
}

function PictureGame({ onExit }: { onExit: () => void }) {
  const { addXp } = useProgress();
  const { pictureStyle } = useSettings();
  const [questions, setQuestions] = useState(buildGame);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 64 }}>{score >= GAME_LENGTH * 0.7 ? '🏆' : '💪'}</Text>
        <Text style={styles.resultTitle}>
          {score} / {GAME_LENGTH} matched
        </Text>
        <Text style={styles.resultXp}>+{score * XP_PER_CORRECT} XP</Text>
        <Button
          title="Play again"
          onPress={() => {
            setQuestions(buildGame());
            setI(0);
            setScore(0);
            setChosen(null);
            setDone(false);
          }}
          style={{ alignSelf: 'stretch' }}
        />
        <Button title="Back to pictures" variant="secondary" onPress={onExit} style={{ alignSelf: 'stretch', marginTop: 10 }} />
      </View>
    );
  }

  const q = questions[i];
  const choose = (p: Pictograph) => {
    if (chosen) return;
    setChosen(p.hanzi);
    speakChinese(q.answer.hanzi);
    if (p.hanzi === q.answer.hanzi) {
      setScore((s) => s + 1);
      addXp(XP_PER_CORRECT);
    }
  };
  const next = () => {
    if (i + 1 >= questions.length) setDone(true);
    else {
      setI(i + 1);
      setChosen(null);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.playHeader}>
        <Pressable onPress={onExit} hitSlop={12}>
          <Text style={styles.quit}>✕</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={(i + (chosen ? 1 : 0)) / questions.length} color={colors.gold} height={10} />
        </View>
        <Text style={styles.counter}>
          {i + 1}/{questions.length}
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
        <Text style={styles.prompt}>
          {pictureStyle === 'ancient' ? 'Which modern character grew from this ancient drawing?' : 'Which character matches this picture?'}
        </Text>
        <Card style={styles.promptCard}>
          <Photo id={q.answer.photo} width={800} label='?' hanzi={q.answer.hanzi} emoji={q.answer.emoji} emojiSize={90} style={styles.promptPhoto} />
          <Text style={styles.promptEnglish}>{q.answer.english}</Text>
        </Card>
        <View style={styles.optionGrid}>
          {q.options.map((opt) => {
            const right = opt.hanzi === q.answer.hanzi;
            const picked = opt.hanzi === chosen;
            const bg = chosen ? (right ? colors.jadeSoft : picked ? colors.wrongSoft : colors.card) : colors.card;
            const border = chosen ? (right ? colors.jade : picked ? colors.wrong : colors.line) : colors.line;
            return (
              <Pressable
                key={opt.hanzi}
                onPress={() => choose(opt)}
                style={({ pressed }) => [styles.option, { backgroundColor: bg, borderColor: border, opacity: pressed && !chosen ? 0.7 : 1 }]}
              >
                <Text style={styles.optionHanzi}>{opt.hanzi}</Text>
                {chosen && <Text style={styles.optionPinyin}>{opt.pinyin} · {opt.english}</Text>}
              </Pressable>
            );
          })}
        </View>
        {chosen && (
          <View style={{ marginTop: 8, gap: 12 }}>
            <Text style={[styles.feedback, { color: chosen === q.answer.hanzi ? colors.jade : colors.wrong }]}>
              {chosen === q.answer.hanzi ? 'Correct! 对了!' : `It's ${q.answer.hanzi} (${q.answer.pinyin})`}
            </Text>
            <Text style={styles.feedbackStory}>{q.answer.story}</Text>
            <Button title={i + 1 >= questions.length ? 'See results' : 'Next'} onPress={next} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 4, marginBottom: 16, lineHeight: 21 },
  explain: { backgroundColor: colors.goldSoft, marginBottom: 16 },
  explainTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  explainRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  explainIcon: { fontSize: 18, width: 24 },
  explainText: { flex: 1, fontSize: 15, color: colors.ink, lineHeight: 21 },
  explainNote: { fontSize: 13, color: colors.muted, marginTop: 4, fontStyle: 'italic' },
  gameCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.red },
  gameTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  gameSub: { color: '#FFE9E6', fontSize: 14, marginTop: 2 },
  arrow: { color: '#fff', fontSize: 26, fontWeight: '700' },
  section: { fontSize: 13, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginTop: 28, textTransform: 'uppercase' },
  sectionSub: { fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: 4, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 12, marginTop: 10, padding: 12 },
  rowPhoto: { width: 92, height: 92, borderRadius: radius.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowHanzi: { fontSize: 38, color: colors.ink },
  rowPinyin: { fontSize: 16, color: colors.red, fontWeight: '700' },
  rowEnglish: { fontSize: 14, color: colors.ink },
  rowStory: { fontSize: 13, color: colors.muted, lineHeight: 18, marginTop: 6 },
  toggleRow: { marginBottom: 16 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  toggle: { flexDirection: 'row', backgroundColor: colors.line, borderRadius: 12, padding: 3 },
  toggleOption: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  toggleOptionActive: { backgroundColor: colors.card },
  toggleText: { fontSize: 14, fontWeight: '700', color: colors.muted },
  toggleTextActive: { color: colors.red },
  ancientCaption: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 0.3 },
  errorCard: { backgroundColor: colors.wrongSoft, marginTop: 16 },
  errorTitle: { fontSize: 16, fontWeight: '800', color: colors.wrong },
  errorText: { fontSize: 14, color: colors.ink, marginTop: 4 },
  errorDetail: { fontSize: 12, color: colors.muted, marginTop: 6 },
  credit: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 24 },
  backdrop: { flex: 1, backgroundColor: 'rgba(43,33,24,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', alignSelf: 'stretch' },
  sheetPhoto: { width: '100%', height: 190 },
  sheetBody: { padding: 20, alignItems: 'center' },
  detailHanzi: { fontSize: 80, color: colors.ink, fontWeight: '500', marginTop: -6 },
  detailPinyin: { fontSize: 24, color: colors.red, fontWeight: '700' },
  detailEnglish: { fontSize: 18, color: colors.ink, marginTop: 2 },
  storyBox: { backgroundColor: colors.goldSoft, borderRadius: radius.md, padding: 14, marginVertical: 14, alignSelf: 'stretch' },
  story: { fontSize: 16, color: colors.ink, lineHeight: 23, textAlign: 'center' },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 14, alignSelf: 'stretch' },
  closeText: { color: colors.muted, fontSize: 15, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  resultTitle: { fontSize: 26, fontWeight: '800', color: colors.ink, marginTop: 12 },
  resultXp: { fontSize: 22, fontWeight: '800', color: colors.gold, marginTop: 8, marginBottom: 28 },
  playHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
  quit: { fontSize: 22, color: colors.muted, fontWeight: '600' },
  counter: { color: colors.muted, fontWeight: '700' },
  prompt: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 12 },
  promptCard: { alignItems: 'center', padding: 0, overflow: 'hidden', marginBottom: 18, borderRadius: radius.lg },
  promptPhoto: { width: '100%', height: 200 },
  promptEnglish: { fontSize: 20, fontWeight: '700', color: colors.ink, paddingVertical: 12 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  option: { width: '48%', borderWidth: 2, borderRadius: radius.md, alignItems: 'center', paddingVertical: 16, marginBottom: 12 },
  optionHanzi: { fontSize: 44, color: colors.ink },
  optionPinyin: { fontSize: 13, color: colors.muted, marginTop: 2 },
  feedback: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  feedbackStory: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 21 },
});
