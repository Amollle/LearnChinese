import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { convoRefs, convoWords } from '../data/convoRefs';
import { ConvoNode, ConvoReply } from '../data/conversations';
import { playChinese } from '../services/audio';
import { Attempt, evaluateAttempt } from '../speech/evaluate';
import { useVoiceRecorder } from '../speech/useVoiceRecorder';
import { colors, radius } from '../theme';
import { Button } from './ui';

/** The "I don't understand / don't know how to respond" helper. */
export default function HelpSheet({
  visible,
  node,
  showPinyin,
  onClose,
  onUseReply,
}: {
  visible: boolean;
  node: ConvoNode;
  showPinyin: boolean;
  onClose: () => void;
  onUseReply: (reply: ConvoReply) => void;
}) {
  const [practiceFor, setPracticeFor] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, Attempt>>({});
  const replies = node.replies.filter((r, i, a) => a.findIndex((x) => x.zh === r.zh) === i);

  const rec = useVoiceRecorder((samples) => {
    if (!practiceFor) return;
    const w = convoWords[practiceFor];
    const others = replies.filter((r) => r.zh !== practiceFor).map((r) => ({ id: r.zh, ref: convoRefs[r.zh] }));
    const extra = Object.keys(convoRefs)
      .filter((k) => k !== practiceFor)
      .slice(0, 8)
      .map((k) => ({ id: k, ref: convoRefs[k] }));
    const a = evaluateAttempt(samples, w, convoRefs[practiceFor], [...others, ...extra].slice(0, 10));
    setResult((r) => ({ ...r, [practiceFor]: a }));
  });

  const practice = (zh: string) => {
    if (rec.state !== 'idle' && practiceFor !== zh) return;
    setPracticeFor(zh);
    rec.toggle();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headRow}>
            <Text style={styles.title}>🤔 Help</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
            {/* 1. what they said */}
            <Text style={styles.section}>THEY SAID</Text>
            <View style={styles.box}>
              <Text style={styles.zh}>{node.npc.zh}</Text>
              <Text style={styles.py}>{node.npc.py}</Text>
              <Text style={styles.en}>“{node.npc.en}”</Text>
              <View style={styles.row}>
                <Button title="🔊 Normal" variant="secondary" onPress={() => playChinese(node.npc.zh)} style={styles.half} />
                <Button title="🐢 Slow" variant="secondary" onPress={() => playChinese(node.npc.zh, true)} style={styles.half} />
              </View>
            </View>

            {/* 2. key words */}
            {node.vocab.length > 0 && (
              <>
                <Text style={styles.section}>KEY WORDS</Text>
                {node.vocab.map((v) => (
                  <Pressable key={v.zh} onPress={() => playChinese(v.zh)} style={styles.vocab}>
                    <Text style={styles.vocabZh}>{v.zh}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vocabPy}>{v.py}</Text>
                      <Text style={styles.vocabEn}>{v.en}</Text>
                    </View>
                    <Text style={styles.speaker}>🔊</Text>
                  </Pressable>
                ))}
              </>
            )}

            {/* 3. how to reply */}
            <Text style={styles.section}>HOW YOU CAN REPLY</Text>
            {replies.map((r) => {
              const res = result[r.zh];
              const recordingThis = practiceFor === r.zh && rec.state !== 'idle';
              return (
                <View key={r.zh} style={styles.reply}>
                  <Text style={styles.replyZh}>{r.zh}</Text>
                  {showPinyin && <Text style={styles.py}>{r.py}</Text>}
                  <Text style={styles.en}>“{r.en}”</Text>
                  <View style={styles.row}>
                    <Button title="🔊 Hear" variant="secondary" onPress={() => playChinese(r.zh)} style={styles.third} />
                    <Button
                      title={recordingThis ? (rec.state === 'recording' ? '■ Stop' : '…') : '🎙️ Practice'}
                      variant="secondary"
                      onPress={() => practice(r.zh)}
                      style={styles.third}
                    />
                    <Button title="Use this" onPress={() => onUseReply(r)} style={styles.third} />
                  </View>
                  {recordingThis && rec.state === 'processing' && <ActivityIndicator color={colors.red} style={{ marginTop: 8 }} />}
                  {practiceFor === r.zh && rec.error && <Text style={styles.err}>{rec.error}</Text>}
                  {res && !recordingThis && <PracticeResult a={res} />}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Short feedback: a one-line summary plus only the syllables that need work. */
export function PracticeResult({ a }: { a: Attempt }) {
  if (!a.ok) return <Text style={styles.feedback}>🤔 {a.problem}</Text>;
  const needWork = a.syllables.filter((s) => s.verdict === 'wrong' || s.verdict === 'unclear').slice(0, 2);
  return (
    <View style={styles.feedbackBox}>
      <Text style={styles.feedbackTitle}>
        {a.summary} <Text style={styles.feedbackScore}>Tones {a.tonesRight}/{a.tonesJudged}</Text>
      </Text>
      {needWork.map((s, i) => (
        <Text key={i} style={styles.feedback}>
          {s.verdict === 'wrong' ? '❌' : '❓'} <Text style={{ fontWeight: '800' }}>{s.py}</Text> — {s.message}
        </Text>
      ))}
      {a.soundTip && <Text style={styles.feedback}>💡 {a.soundTip}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,33,24,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '88%', paddingHorizontal: 20, paddingTop: 10 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 10 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  close: { fontSize: 16, fontWeight: '700', color: colors.red },
  section: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  box: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14 },
  zh: { fontSize: 24, color: colors.ink },
  py: { fontSize: 15, color: colors.red, fontWeight: '600', marginTop: 3 },
  en: { fontSize: 15, color: colors.muted, marginTop: 3 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  half: { flex: 1, paddingVertical: 11 },
  third: { flex: 1, paddingVertical: 11, paddingHorizontal: 6 },
  vocab: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, marginBottom: 8 },
  vocabZh: { fontSize: 22, color: colors.ink, minWidth: 60 },
  vocabPy: { fontSize: 14, color: colors.red, fontWeight: '700' },
  vocabEn: { fontSize: 13, color: colors.muted },
  speaker: { fontSize: 18 },
  reply: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 10 },
  replyZh: { fontSize: 22, color: colors.ink },
  err: { fontSize: 13, color: colors.wrong, marginTop: 8 },
  feedbackBox: { marginTop: 10, backgroundColor: colors.goldSoft, borderRadius: radius.sm, padding: 10, gap: 4 },
  feedbackTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  feedbackScore: { fontWeight: '600', color: colors.muted },
  feedback: { fontSize: 13, color: colors.ink, lineHeight: 19 },
});
