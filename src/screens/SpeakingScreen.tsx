import {
  AudioQuality,
  createAudioPlayer,
  IOSOutputFormat,
  RecordingOptions,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { File } from 'expo-file-system';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import PitchGraph from '../components/PitchGraph';
import { Button, Card, SpeakButton, speakChinese } from '../components/ui';
import { useProgress } from '../context/ProgressContext';
import { lessons } from '../data/lessons';
import { speechRefs, speechWords } from '../data/speechRefs';
import { decodePcm, resampleTo16k } from '../speech/analysis';
import { Attempt, evaluateAttempt, pickCompetitors, SpeechWord } from '../speech/evaluate';
import { colors, radius } from '../theme';

const TONE_COLORS = ['#7A6E64', '#C8312B', '#E0A526', '#2E8B6E', '#3B6FB6', '#7A6E64'];
const MAX_SECONDS = 4;

// Uncompressed 16 kHz mono recording, so the app can analyse the pitch itself.
const RECORDING: RecordingOptions = {
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  ios: {
    extension: '.wav',
    sampleRate: 16000,
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.MAX,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: { extension: '.m4a', sampleRate: 16000, outputFormat: 'mpeg4', audioEncoder: 'aac' },
  web: {},
};

type Phase = 'ready' | 'recording' | 'checking' | 'result';

export default function SpeakingScreen({ lessonId, onClose }: { lessonId?: string | null; onClose: () => void }) {
  const { progress, addXp } = useProgress();
  const defaultLesson =
    lessonId ?? lessons.find((l) => !progress.completedLessons.includes(l.id))?.id ?? lessons[0].id;
  const [chosen, setChosen] = useState(defaultLesson);
  const words = useMemo(
    () => speechWords.filter((w) => w.id.startsWith(chosen + '-')),
    [chosen],
  );
  const [index, setIndex] = useState(0);
  const word: SpeechWord | undefined = words[index];

  const recorder = useAudioRecorder(RECORDING);
  const [phase, setPhase] = useState<Phase>('ready');
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [rewarded, setRewarded] = useState<Record<string, boolean>>({});
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPhase('ready');
    setAttempt(null);
    setError(null);
    setRecordingUri(null);
    if (word) speakChinese(word.hanzi);
  }, [word?.id]);

  useEffect(() => () => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
  }, []);

  const start = async () => {
    setError(null);
    if (Platform.OS !== 'ios') {
      setError('Speaking practice works on iPhone for now.');
      return;
    }
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError('Please allow microphone access for Expo Go in your iPhone Settings, then try again.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setPhase('recording');
    stopTimer.current = setTimeout(() => stop(), MAX_SECONDS * 1000);
  };

  const stop = async () => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = null;
    try {
      await recorder.stop();
    } catch {
      // already stopped
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, interruptionMode: 'duckOthers' });
    const uri = recorder.uri;
    if (!uri || !word) {
      setPhase('ready');
      return;
    }
    setRecordingUri(uri);
    setPhase('checking');
    // let the "Checking…" state draw before the analysis runs
    setTimeout(async () => {
      try {
        const bytes = new Uint8Array(await new File(uri).arrayBuffer());
        const { samples, sampleRate } = decodePcm(bytes);
        const x = resampleTo16k(samples, sampleRate);
        const result = evaluateAttempt(x, word, speechRefs[word.id], pickCompetitors(word, speechWords, speechRefs));
        setAttempt(result);
        if (result.ok && result.tonesJudged > 0 && result.tonesRight === result.tonesJudged && !rewarded[word.id]) {
          addXp(5);
          setRewarded((r) => ({ ...r, [word.id]: true }));
        }
        setPhase('result');
      } catch {
        setError('Something went wrong reading the recording. Please try again.');
        setPhase('ready');
      }
    }, 60);
  };

  const playMine = () => {
    if (!recordingUri) return;
    const p = createAudioPlayer({ uri: recordingUri });
    p.play();
    setTimeout(() => p.remove(), 6000);
  };

  const next = () => setIndex((i) => (i + 1) % Math.max(1, words.length));

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.back}>‹ Learn</Text>
        </Pressable>
        <Text style={styles.headerTitle}>🎙️ Speaking practice</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {lessons.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => {
              setChosen(l.id);
              setIndex(0);
            }}
            style={[styles.chip, chosen === l.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, chosen === l.id && { color: '#fff' }]}>
              {l.emoji} {l.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {word ? (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.counter}>
            Word {index + 1} of {words.length}
          </Text>
          <Card style={styles.wordCard}>
            <Text style={styles.hanzi}>{word.text}</Text>
            <Text style={styles.pinyin}>
              {word.syllables.map((s, i) => (
                <Text key={i} style={{ color: TONE_COLORS[s.spoken] }}>
                  {s.py}
                  {i < word.syllables.length - 1 ? ' ' : ''}
                </Text>
              ))}
            </Text>
            <Text style={styles.english}>{lessons.flatMap((l) => l.words).find((w) => w.id === word.id)?.english}</Text>
            <View style={styles.modelRow}>
              <SpeakButton text={word.hanzi} size={48} />
              <Text style={styles.modelText}>Listen to the model, then say it yourself</Text>
            </View>
          </Card>

          {phase !== 'result' && (
            <View style={styles.micArea}>
              <Pressable
                onPress={phase === 'recording' ? stop : phase === 'ready' ? start : undefined}
                style={({ pressed }) => [
                  styles.mic,
                  phase === 'recording' && styles.micRecording,
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityLabel={phase === 'recording' ? 'Stop recording' : 'Start recording'}
              >
                {phase === 'checking' ? <ActivityIndicator color="#fff" size="large" /> : <Text style={styles.micIcon}>{phase === 'recording' ? '■' : '🎙️'}</Text>}
              </Pressable>
              <Text style={styles.micHint}>
                {phase === 'recording' ? 'Listening… tap to stop' : phase === 'checking' ? 'Checking your tones…' : 'Tap and say the word'}
              </Text>
              {error && <Text style={styles.error}>{error}</Text>}
            </View>
          )}

          {phase === 'result' && attempt && (
            <View>
              {!attempt.ok ? (
                <Card style={[styles.resultCard, { backgroundColor: colors.goldSoft }]}>
                  <Text style={styles.summary}>🤔 {attempt.problem}</Text>
                </Card>
              ) : (
                <Card style={styles.resultCard}>
                  <Text style={styles.summary}>{attempt.summary}</Text>
                  <Text style={styles.scoreLine}>
                    Tones {attempt.tonesRight}/{attempt.tonesJudged} ·{' '}
                    {attempt.sound === 'good' ? 'Sounds: good ✓' : attempt.sound === 'close' ? 'Sounds: close' : 'Sounds: different'}
                  </Text>

                  {attempt.syllables.map((s, i) => (
                    <View key={i} style={styles.sylRow}>
                      <Text style={styles.sylMark}>
                        {s.verdict === 'ok' ? '✅' : s.verdict === 'wrong' ? '❌' : s.verdict === 'neutral' ? '·' : '❓'}
                      </Text>
                      <Text style={[styles.sylPy, { color: TONE_COLORS[s.expected] }]}>{s.py}</Text>
                      <Text style={styles.sylMsg}>{s.message}</Text>
                    </View>
                  ))}

                  {attempt.soundTip && <Text style={styles.tip}>💡 {attempt.soundTip}</Text>}

                  <View style={{ marginTop: 12 }}>
                    <PitchGraph user={attempt.userPitch} model={attempt.refPitch} userCuts={attempt.userCuts} />
                  </View>
                </Card>
              )}

              <View style={styles.actions}>
                <Button title="▶ My voice" variant="secondary" onPress={playMine} style={{ flex: 1 }} />
                <Button title="🔊 Model" variant="secondary" onPress={() => speakChinese(word.hanzi)} style={{ flex: 1 }} />
              </View>
              <View style={styles.actions}>
                <Button
                  title="🔁 Try again"
                  variant="secondary"
                  onPress={() => {
                    setAttempt(null);
                    setPhase('ready');
                  }}
                  style={{ flex: 1 }}
                />
                <Button title="Next word →" onPress={next} style={{ flex: 1 }} />
              </View>
            </View>
          )}

          <Text style={styles.note}>
            The tone check listens to the rise and fall of your voice. It's a helpful guide, not perfect — if it says
            “not clear”, listen to the model and try once more.
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Text style={styles.note}>No speaking words in this lesson yet.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  back: { fontSize: 17, color: colors.red, fontWeight: '700', width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 6 },
  chip: { borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.red, borderColor: colors.red },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  body: { padding: 20, paddingTop: 10, paddingBottom: 40 },
  counter: { fontSize: 13, color: colors.muted, fontWeight: '700', marginBottom: 8 },
  wordCard: { alignItems: 'center', paddingVertical: 22, borderRadius: radius.lg },
  hanzi: { fontSize: 60, color: colors.ink },
  pinyin: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  english: { fontSize: 16, color: colors.muted, marginTop: 4 },
  modelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  modelText: { fontSize: 13, color: colors.muted, flexShrink: 1 },
  micArea: { alignItems: 'center', marginTop: 26 },
  mic: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  micRecording: { backgroundColor: colors.wrong, transform: [{ scale: 1.08 }] },
  micIcon: { fontSize: 40, color: '#fff' },
  micHint: { fontSize: 15, color: colors.muted, marginTop: 12, fontWeight: '600' },
  error: { fontSize: 14, color: colors.wrong, marginTop: 10, textAlign: 'center', fontWeight: '600' },
  resultCard: { marginTop: 18 },
  summary: { fontSize: 17, fontWeight: '800', color: colors.ink, lineHeight: 23 },
  scoreLine: { fontSize: 13, color: colors.muted, fontWeight: '700', marginTop: 4, marginBottom: 6 },
  sylRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  sylMark: { fontSize: 15, width: 22 },
  sylPy: { fontSize: 17, fontWeight: '800', width: 54 },
  sylMsg: { flex: 1, fontSize: 14, color: colors.ink, lineHeight: 20 },
  tip: { fontSize: 14, color: colors.ink, backgroundColor: colors.goldSoft, borderRadius: radius.sm, padding: 10, marginTop: 12, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  note: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 20, lineHeight: 17 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
