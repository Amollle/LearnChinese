import type { ScrollViewInstance } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import PetBuddy, { petReact } from '../pet/PetBuddy';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import HelpSheet from '../components/HelpSheet';
import { Button, Card } from '../components/ui';
import { useProgress } from '../context/ProgressContext';
import { convoRefs, convoWords } from '../data/convoRefs';
import { ConvoLine, ConvoReply, Scenario } from '../data/conversations';
import { playChinese } from '../services/audio';
import { evaluateAttempt, identifyReply } from '../speech/evaluate';
import { useVoiceRecorder } from '../speech/useVoiceRecorder';
import { colors, radius } from '../theme';

type Message = ConvoLine & { from: 'npc' | 'me'; spoken?: string };

const PARTNER_AVATAR: Record<string, string> = {
  restaurant: '🧑‍🍳',
  cafe: '🧑‍💼',
  taxi: '🧑‍✈️',
  directions: '🙋',
  hotel: '🛎️',
  market: '🧓',
};

export default function ConversationScreen({ scenario, onClose }: { scenario: Scenario; onClose: () => void }) {
  const { addXp } = useProgress();
  const [nodeId, setNodeId] = useState<string>(scenario.start);
  const [messages, setMessages] = useState<Message[]>([]);
  const [waiting, setWaiting] = useState(false); // partner is "typing"
  const [done, setDone] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showEnglish, setShowEnglish] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [spokenCount, setSpokenCount] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const node = scenario.nodes[nodeId];

  // the partner speaks when a new node starts
  useEffect(() => {
    setMessages((m) => [...m, { ...node.npc, from: 'npc' }]);
    playChinese(node.npc.zh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  useEffect(() => {
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length, waiting, done]);

  // reward finishing the conversation (more for replies spoken out loud)
  useEffect(() => {
    if (done) {
      addXp(15 + spokenCount * 2);
      petReact('done');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const replies = node.replies.filter((r, i, a) => a.findIndex((x) => x.zh === r.zh) === i);
  const allReplies = Array.from(new Set(Object.values(scenario.nodes).flatMap((n) => n.replies.map((r) => r.zh))));

  const send = (reply: ConvoReply, spoken?: string) => {
    setHelpOpen(false);
    setVoiceNote(null);
    setMessages((m) => [...m, { zh: reply.zh, py: reply.py, en: reply.en, from: 'me', spoken }]);
    if (!spoken) playChinese(reply.zh);
    if (reply.next === 'END') {
      setDone(true);
      return;
    }
    setWaiting(true);
    setTimeout(() => {
      setWaiting(false);
      setNodeId(reply.next);
    }, 1400);
  };

  const rec = useVoiceRecorder((samples) => {
    const options = replies.map((r) => ({ id: r.zh, ref: convoRefs[r.zh] }));
    const others = allReplies.filter((z) => !replies.some((r) => r.zh === z)).slice(0, 8).map((z) => ({ id: z, ref: convoRefs[z] }));
    const pick = identifyReply(samples, options, others);
    if (!pick.id) {
      setVoiceNote(pick.reason === 'quiet' ? 'I couldn’t hear you — try again a bit louder.' : 'I didn’t quite catch that. Try again, or tap a reply.');
      return;
    }
    const reply = replies.find((r) => r.zh === pick.id)!;
    const a = evaluateAttempt(samples, convoWords[reply.zh], convoRefs[reply.zh]);
    let note = '🎙️ Understood!';
    if (a.ok && a.tonesJudged > 0) {
      const wrong = a.syllables.filter((s) => s.verdict === 'wrong');
      note = wrong.length
        ? `🎙️ Understood! Tones ${a.tonesRight}/${a.tonesJudged} — check ${wrong.map((s) => s.py).join(', ')}`
        : `🎙️ Understood! Tones ${a.tonesRight}/${a.tonesJudged} ✓`;
    }
    setSpokenCount((c) => c + 1);
    send(reply, note);
  }, 6);

  const restart = () => {
    setMessages([]);
    setDone(false);
    setSpokenCount(0);
    if (nodeId === scenario.start) {
      setMessages([{ ...scenario.nodes[scenario.start].npc, from: 'npc' }]);
      playChinese(scenario.nodes[scenario.start].npc.zh);
    } else setNodeId(scenario.start);
  };

  const myTurn = !waiting && !done;
  const usedPhrases = messages.filter((m) => m.from === 'me');

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.back}>‹ Talk</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {scenario.emoji} {scenario.title}
        </Text>
        <View style={{ width: 50, alignItems: 'flex-end' }}>
          <PetBuddy size={42} />
        </View>
      </View>
      <View style={styles.toggles}>
        <Text style={styles.toggleLabel}>Pinyin</Text>
        <Switch value={showPinyin} onValueChange={setShowPinyin} trackColor={{ true: colors.red }} />
        <Text style={[styles.toggleLabel, { marginLeft: 14 }]}>English</Text>
        <Switch value={showEnglish} onValueChange={setShowEnglish} trackColor={{ true: colors.red }} />
      </View>

      <ScrollView ref={scroll} contentContainerStyle={styles.chat}>
        <Text style={styles.scene}>
          You're talking to the {scenario.partnerEn} ({scenario.partner}).
        </Text>
        {messages.map((m, i) =>
          m.from === 'npc' ? (
            <View key={i} style={styles.npcRow}>
              <Text style={styles.avatar}>{PARTNER_AVATAR[scenario.id] ?? '🙂'}</Text>
              <Pressable onPress={() => playChinese(m.zh)} style={[styles.bubble, styles.npcBubble]}>
                <Text style={styles.bubbleZh}>{m.zh} <Text style={styles.replay}>🔊</Text></Text>
                {showPinyin && <Text style={styles.bubblePy}>{m.py}</Text>}
                {showEnglish && <Text style={styles.bubbleEn}>{m.en}</Text>}
              </Pressable>
            </View>
          ) : (
            <View key={i} style={styles.meRow}>
              <Pressable onPress={() => playChinese(m.zh)} style={[styles.bubble, styles.meBubble]}>
                <Text style={[styles.bubbleZh, { color: '#fff' }]}>{m.zh}</Text>
                {showPinyin && <Text style={[styles.bubblePy, { color: '#FFE3DF' }]}>{m.py}</Text>}
                {showEnglish && <Text style={[styles.bubbleEn, { color: '#FFE3DF' }]}>{m.en}</Text>}
              </Pressable>
              {m.spoken && <Text style={styles.spokenNote}>{m.spoken}</Text>}
            </View>
          ),
        )}
        {waiting && (
          <View style={styles.npcRow}>
            <Text style={styles.avatar}>{PARTNER_AVATAR[scenario.id] ?? '🙂'}</Text>
            <View style={[styles.bubble, styles.npcBubble]}>
              <Text style={styles.typing}>•••</Text>
            </View>
          </View>
        )}
        {done && (
          <Card style={styles.doneCard}>
            <Text style={styles.doneTitle}>🎉 Conversation complete!</Text>
            <Text style={styles.doneSub}>
              +{15 + spokenCount * 2} XP{spokenCount > 0 ? ` · you spoke ${spokenCount} repl${spokenCount === 1 ? 'y' : 'ies'} out loud` : ''}
            </Text>
            <Text style={styles.phrasesTitle}>Phrases you used</Text>
            {usedPhrases.map((p, i) => (
              <Pressable key={i} onPress={() => playChinese(p.zh)} style={styles.phrase}>
                <Text style={styles.phraseZh}>{p.zh}</Text>
                <Text style={styles.phraseEn}>
                  {p.py} — {p.en}
                </Text>
              </Pressable>
            ))}
            <View style={styles.row}>
              <Button title="Try other choices" variant="secondary" onPress={restart} style={{ flex: 1 }} />
              <Button title="Back to Talk" onPress={onClose} style={{ flex: 1 }} />
            </View>
          </Card>
        )}
      </ScrollView>

      {myTurn && (
        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Your reply — tap one, or say it:</Text>
          {replies.map((r) => (
            <Pressable key={r.zh} onPress={() => send(r)} style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.redSoft }]}>
              <Text style={styles.optionZh}>{r.zh}</Text>
              {showPinyin && <Text style={styles.optionPy}>{r.py}</Text>}
              {showEnglish && <Text style={styles.optionEn}>{r.en}</Text>}
            </Pressable>
          ))}
          {(voiceNote || rec.error) && <Text style={styles.voiceNote}>{rec.error ?? voiceNote}</Text>}
          <View style={styles.row}>
            <Pressable
              onPress={rec.toggle}
              style={({ pressed }) => [styles.micBtn, rec.state === 'recording' && { backgroundColor: colors.wrong }, pressed && { opacity: 0.85 }]}
            >
              {rec.state === 'processing' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.micText}>{rec.state === 'recording' ? '■ Stop' : '🎙️ Say it'}</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setHelpOpen(true)} style={({ pressed }) => [styles.helpBtn, pressed && { opacity: 0.85 }]}>
              <Text style={styles.helpText}>🤔 I don't understand /{'\n'}don't know what to say</Text>
            </Pressable>
          </View>
        </View>
      )}

      <HelpSheet
        visible={helpOpen}
        node={node}
        showPinyin
        onClose={() => setHelpOpen(false)}
        onUseReply={(r) => {
          setHelpOpen(false);
          send(r);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
  back: { fontSize: 17, color: colors.red, fontWeight: '700', width: 50 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  toggles: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 6 },
  toggleLabel: { fontSize: 13, color: colors.muted, fontWeight: '700' },
  chat: { padding: 16, paddingBottom: 24 },
  scene: { fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 12 },
  npcRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12, paddingRight: 40 },
  meRow: { alignItems: 'flex-end', marginBottom: 12, paddingLeft: 50 },
  avatar: { fontSize: 28 },
  bubble: { borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14, maxWidth: '100%' },
  npcBubble: { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.line, flexShrink: 1 },
  meBubble: { backgroundColor: colors.red, borderBottomRightRadius: 4 },
  bubbleZh: { fontSize: 20, color: colors.ink },
  replay: { fontSize: 13 },
  bubblePy: { fontSize: 13, color: colors.red, marginTop: 2 },
  bubbleEn: { fontSize: 13, color: colors.muted, marginTop: 2, fontStyle: 'italic' },
  spokenNote: { fontSize: 12, color: colors.jade, fontWeight: '700', marginTop: 4 },
  typing: { fontSize: 20, color: colors.muted, letterSpacing: 2 },
  panel: { borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg, padding: 14, paddingBottom: 10 },
  panelLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 0.5, marginBottom: 8 },
  option: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8 },
  optionZh: { fontSize: 19, color: colors.ink },
  optionPy: { fontSize: 13, color: colors.red, marginTop: 1 },
  optionEn: { fontSize: 13, color: colors.muted, marginTop: 1 },
  voiceNote: { fontSize: 13, color: colors.wrong, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  micBtn: { flex: 1, backgroundColor: colors.jade, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  micText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  helpBtn: { flex: 1.3, backgroundColor: colors.goldSoft, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderWidth: 1.5, borderColor: colors.gold },
  helpText: { color: colors.ink, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  doneCard: { marginTop: 8 },
  doneTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  doneSub: { fontSize: 14, color: colors.gold, fontWeight: '800', marginTop: 4 },
  phrasesTitle: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginTop: 14, marginBottom: 4 },
  phrase: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  phraseZh: { fontSize: 17, color: colors.ink },
  phraseEn: { fontSize: 13, color: colors.muted },
});
