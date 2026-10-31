import type { ScrollViewInstance } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import PetBuddy, { petReact } from '../pet/PetBuddy';
import { Button, Card } from '../components/ui';
import { useProgress } from '../context/ProgressContext';
import { allWords } from '../data/lessons';
import { playChinese } from '../services/audio';
import { AiLine, AiUnavailable, ChatLine, Coaching, getCoaching, takeTurn } from '../services/ai';
import { colors, radius } from '../theme';

/** Starting points for a free conversation. The learner can also type their own. */
const TOPICS = [
  { emoji: '🍜', en: 'Order food at a noodle shop', situation: 'ordering food at a small noodle shop in Beijing' },
  { emoji: '🏫', en: 'Meet a new classmate', situation: 'meeting a new classmate at school for the first time' },
  { emoji: '🐼', en: 'Visit the panda base', situation: 'visiting a panda base and talking to a keeper' },
  { emoji: '🛍️', en: 'Buy something at a market', situation: 'buying fruit at a street market and asking the price' },
  { emoji: '🚕', en: 'Take a taxi somewhere', situation: 'taking a taxi and telling the driver where to go' },
  { emoji: '👋', en: 'Just chat about my day', situation: 'a friendly chat about the learner’s day and family' },
];

type Msg = {
  from: 'partner' | 'me';
  zh: string;
  py?: string;
  en?: string;
  /** For the learner's own lines: what the AI thought they meant. */
  understood?: string | null;
  /** For the learner's own lines: the AI's gentle correction. */
  note?: string | null;
};

export default function FreeTalkScreen({ onClose }: { onClose: () => void }) {
  const { progress, addXp, coachWords, addCoachWords } = useProgress();
  const [situation, setSituation] = useState<string | null>(null);
  const [topicText, setTopicText] = useState('');

  if (!situation) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.back}>‹ Talk</Text>
          </Pressable>
          <Text style={styles.headerTitle}>✨ Free talk</Text>
          <View style={{ width: 50, alignItems: 'flex-end' }}>
            <PetBuddy size={42} />
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.picker} showsVerticalScrollIndicator={false}>
          <Text style={styles.pickerIntro}>
            Here there’s no script — you can say anything you like, and your partner answers for real. Pick where you
            are:
          </Text>
          {TOPICS.map((t) => (
            <Pressable key={t.situation} onPress={() => setSituation(t.situation)}>
              {({ pressed }) => (
                <Card style={[styles.topicCard, pressed && { opacity: 0.85 }]}>
                  <Text style={styles.topicEmoji}>{t.emoji}</Text>
                  <Text style={styles.topicText}>{t.en}</Text>
                </Card>
              )}
            </Pressable>
          ))}
          <Text style={styles.ownLabel}>Or make up your own</Text>
          <TextInput
            value={topicText}
            onChangeText={setTopicText}
            placeholder="e.g. buying a train ticket to Xi'an"
            placeholderTextColor={colors.muted}
            style={styles.topicInput}
            returnKeyType="go"
            onSubmitEditing={() => topicText.trim() && setSituation(topicText.trim())}
          />
          <Button
            title="Start talking"
            onPress={() => topicText.trim() && setSituation(topicText.trim())}
            style={{ marginTop: 10 }}
          />
          {coachWords.length > 0 && (
            <Text style={styles.savedNote}>
              You have {coachWords.length} phrase{coachWords.length === 1 ? '' : 's'} from past talks waiting in Review.
            </Text>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <Chat
      situation={situation}
      known={knownWords(progress.learned)}
      onClose={onClose}
      onXp={addXp}
      onSaveWords={addCoachWords}
    />
  );
}

/** The hanzi the learner has studied, so the AI stays near their level. */
function knownWords(learnedIds: string[]) {
  const byId = new Map(allWords.map((w) => [w.id, w.hanzi]));
  return learnedIds.map((id) => byId.get(id)).filter((h): h is string => Boolean(h));
}

function Chat({
  situation,
  known,
  onClose,
  onXp,
  onSaveWords,
}: {
  situation: string;
  known: string[];
  onClose: () => void;
  onXp: (n: number) => void;
  onSaveWords: (words: { zh: string; py: string; en: string; why?: string; addedAt: number }[]) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [suggestions, setSuggestions] = useState<AiLine[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showEnglish, setShowEnglish] = useState(false);
  const [coach, setCoach] = useState<Coaching | null>(null);
  const [coaching, setCoaching] = useState(false);
  const [turns, setTurns] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const started = useRef(false);

  const historyFor = (msgs: Msg[]): ChatLine[] => msgs.map((m) => ({ role: m.from, zh: m.zh }));

  /** Open the conversation once. */
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const r = await takeTurn({ situation, known, history: [] });
        setMessages([{ from: 'partner', ...r.partner }]);
        setSuggestions(r.suggestions);
        playChinese(r.partner.zh);
      } catch (e) {
        setError(friendly(e));
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length, busy, coach, ended]);

  /** Send what the learner wrote (or dictated) and get the partner's reply. */
  const send = async (text: string, replacing?: number) => {
    const said = text.trim();
    if (!said || busy) return;
    setDraft('');
    setError(null);
    setSuggestions([]);

    // When correcting, drop that message and everything after it first.
    const base = replacing === undefined ? messages : messages.slice(0, replacing);
    const mine: Msg = { from: 'me', zh: said };
    const withMine = [...base, mine];
    setMessages(withMine);
    setBusy(true);

    try {
      const r = await takeTurn({ situation, known, history: historyFor(base), said });
      setMessages([
        ...base,
        { ...mine, understood: r.understood, note: r.note },
        { from: 'partner', ...r.partner },
      ]);
      setSuggestions(r.suggestions);
      setTurns((t) => t + 1);
      playChinese(r.partner.zh);
      if (r.ended) setEnded(true);
    } catch (e) {
      // keep what they wrote so nothing is lost
      setMessages(base);
      setDraft(said);
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  };

  /** "That's not what I said" — put the line back in the box to fix. */
  const correct = (index: number) => {
    setDraft(messages[index].zh);
    setMessages(messages.slice(0, index));
    setSuggestions([]);
    setEnded(false);
  };

  const finish = async () => {
    setCoaching(true);
    setError(null);
    const xp = 10 + turns * 3;
    try {
      const c = await getCoaching({ situation, known, history: historyFor(messages) });
      setCoach(c);
      if (c.phrases.length) {
        onSaveWords(c.phrases.map((p) => ({ ...p, addedAt: Date.now() })));
      }
      onXp(xp);
      petReact('done');
    } catch (e) {
      setError(friendly(e));
    } finally {
      setCoaching(false);
    }
  };

  const myTurn = !busy && !coach && !coaching;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.back}>‹ Talk</Text>
        </Pressable>
        <Text style={styles.headerTitle}>✨ Free talk</Text>
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

      <ScrollView ref={scroll} contentContainerStyle={styles.chat} keyboardDismissMode="interactive">
        <Text style={styles.scene}>{situation}</Text>

        {messages.map((m, i) =>
          m.from === 'partner' ? (
            <View key={i} style={styles.npcRow}>
              <Text style={styles.avatar}>🙂</Text>
              <Pressable onPress={() => playChinese(m.zh)} style={[styles.bubble, styles.npcBubble]}>
                <Text style={styles.bubbleZh}>
                  {m.zh} <Text style={styles.replay}>🔊</Text>
                </Text>
                {showPinyin && !!m.py && <Text style={styles.bubblePy}>{m.py}</Text>}
                {showEnglish && !!m.en && <Text style={styles.bubbleEn}>{m.en}</Text>}
              </Pressable>
            </View>
          ) : (
            <View key={i} style={styles.meRow}>
              <Pressable onPress={() => playChinese(m.zh)} style={[styles.bubble, styles.meBubble]}>
                <Text style={[styles.bubbleZh, { color: '#fff' }]}>{m.zh}</Text>
              </Pressable>
              {!!m.understood && (
                <View style={styles.heardBox}>
                  <Text style={styles.heardText}>🤔 I understood: {m.understood}</Text>
                  <Pressable onPress={() => correct(i)} hitSlop={6}>
                    <Text style={styles.heardFix}>That’s not what I said — let me fix it</Text>
                  </Pressable>
                </View>
              )}
              {!!m.note && <Text style={styles.noteText}>💡 {m.note}</Text>}
            </View>
          ),
        )}

        {busy && (
          <View style={styles.npcRow}>
            <Text style={styles.avatar}>🙂</Text>
            <View style={[styles.bubble, styles.npcBubble]}>
              <Text style={styles.typing}>•••</Text>
            </View>
          </View>
        )}

        {!!error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}

        {coaching && (
          <Card style={styles.doneCard}>
            <ActivityIndicator color={colors.red} />
            <Text style={styles.coachWait}>Your coach is reading the conversation…</Text>
          </Card>
        )}

        {coach && (
          <Card style={styles.doneCard}>
            <Text style={styles.doneTitle}>🎓 Your coach</Text>
            <Text style={styles.coachSummary}>{coach.summary}</Text>

            {coach.didWell.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>WHAT WENT WELL</Text>
                {coach.didWell.map((t, i) => (
                  <Text key={i} style={styles.bullet}>
                    ✅ {t}
                  </Text>
                ))}
              </>
            )}

            {coach.workOn.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>WHAT TO WORK ON</Text>
                {coach.workOn.map((t, i) => (
                  <Text key={i} style={styles.bullet}>
                    •{' '}{t}
                  </Text>
                ))}
              </>
            )}

            {coach.phrases.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>SAVED TO YOUR REVIEW</Text>
                {coach.phrases.map((p, i) => (
                  <Pressable key={i} onPress={() => playChinese(p.zh)} style={styles.phrase}>
                    <Text style={styles.phraseZh}>
                      {p.zh} <Text style={styles.replay}>🔊</Text>
                    </Text>
                    <Text style={styles.phraseEn}>
                      {p.py} — {p.en}
                    </Text>
                    {!!p.why && <Text style={styles.phraseWhy}>{p.why}</Text>}
                  </Pressable>
                ))}
                <Text style={styles.savedNote}>These are waiting for you in Review.</Text>
              </>
            )}

            <Button title="Back to Talk" onPress={onClose} style={{ marginTop: 14 }} />
          </Card>
        )}
      </ScrollView>

      {myTurn && (
        <View style={styles.panel}>
          {suggestions.length > 0 && (
            <>
              <Text style={styles.panelLabel}>Stuck? Tap one to use it:</Text>
              {suggestions.map((s, i) => (
                <Pressable
                  key={i}
                  onPress={() => send(s.zh)}
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.redSoft }]}
                >
                  <Text style={styles.optionZh}>{s.zh}</Text>
                  {showPinyin && !!s.py && <Text style={styles.optionPy}>{s.py}</Text>}
                  {showEnglish && !!s.en && <Text style={styles.optionEn}>{s.en}</Text>}
                </Pressable>
              ))}
            </>
          )}

          <Text style={styles.panelLabel}>Say your own thing — tap 🎤 on the keyboard, or type:</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="你好…"
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
              returnKeyType="send"
              onSubmitEditing={() => send(draft)}
            />
            <Pressable
              onPress={() => send(draft)}
              disabled={!draft.trim()}
              style={({ pressed }) => [
                styles.sendBtn,
                (!draft.trim() || pressed) && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          </View>

          <Pressable onPress={finish} disabled={messages.length < 2} hitSlop={6}>
            <Text style={[styles.finish, messages.length < 2 && { opacity: 0.4 }]}>
              {ended ? '🎓 That’s a wrap — see how I did' : '🎓 I’m done — show me how I did'}
            </Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function friendly(e: unknown) {
  if (e instanceof AiUnavailable) return e.message;
  return 'Something went wrong talking to your partner. Please try again.';
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
  back: { fontSize: 17, color: colors.red, fontWeight: '700', width: 50 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  toggles: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 6 },
  toggleLabel: { fontSize: 13, color: colors.muted, fontWeight: '700' },

  picker: { padding: 20, paddingBottom: 40 },
  pickerIntro: { fontSize: 15, color: colors.muted, lineHeight: 21, marginBottom: 14 },
  topicCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  topicEmoji: { fontSize: 28 },
  topicText: { fontSize: 17, fontWeight: '700', color: colors.ink, flex: 1 },
  ownLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginTop: 18, marginBottom: 6 },
  topicInput: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 14, fontSize: 16, color: colors.ink },

  chat: { padding: 16, paddingBottom: 24 },
  scene: { fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 12, fontStyle: 'italic' },
  npcRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12, paddingRight: 40 },
  meRow: { alignItems: 'flex-end', marginBottom: 12, paddingLeft: 40 },
  avatar: { fontSize: 28 },
  bubble: { borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14, maxWidth: '100%' },
  npcBubble: { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.line, flexShrink: 1 },
  meBubble: { backgroundColor: colors.red, borderBottomRightRadius: 4 },
  bubbleZh: { fontSize: 20, color: colors.ink },
  replay: { fontSize: 13 },
  bubblePy: { fontSize: 13, color: colors.red, marginTop: 2 },
  bubbleEn: { fontSize: 13, color: colors.muted, marginTop: 2, fontStyle: 'italic' },
  typing: { fontSize: 20, color: colors.muted, letterSpacing: 2 },

  heardBox: { alignItems: 'flex-end', marginTop: 4, maxWidth: '92%' },
  heardText: { fontSize: 12, color: colors.muted, textAlign: 'right' },
  heardFix: { fontSize: 12, color: colors.red, fontWeight: '700', marginTop: 2 },
  noteText: { fontSize: 13, color: colors.jade, fontWeight: '600', marginTop: 4, textAlign: 'right', maxWidth: '92%' },

  errorCard: { backgroundColor: colors.wrongSoft, borderWidth: 1, borderColor: colors.wrong },
  errorText: { fontSize: 14, color: colors.wrong, fontWeight: '600' },

  panel: { borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg, padding: 14, paddingBottom: 10 },
  panelLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  option: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8 },
  optionZh: { fontSize: 19, color: colors.ink },
  optionPy: { fontSize: 13, color: colors.red, marginTop: 1 },
  optionEn: { fontSize: 13, color: colors.muted, marginTop: 1 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 18, color: colors.ink, maxHeight: 110 },
  sendBtn: { backgroundColor: colors.red, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 14 },
  sendText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  finish: { fontSize: 14, color: colors.red, fontWeight: '800', textAlign: 'center', marginTop: 12, marginBottom: 2 },

  doneCard: { marginTop: 8, alignItems: 'stretch' },
  doneTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  coachWait: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 8 },
  coachSummary: { fontSize: 15, color: colors.ink, lineHeight: 22, marginTop: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginTop: 16, marginBottom: 6 },
  bullet: { fontSize: 14, color: colors.ink, lineHeight: 21, marginBottom: 4 },
  phrase: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.line },
  phraseZh: { fontSize: 18, color: colors.ink },
  phraseEn: { fontSize: 13, color: colors.muted, marginTop: 1 },
  phraseWhy: { fontSize: 12, color: colors.jade, marginTop: 2 },
  savedNote: { fontSize: 13, color: colors.jade, fontWeight: '700', marginTop: 10, textAlign: 'center' },
});
