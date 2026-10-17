import React, { useEffect, useMemo, useState } from 'react';
import PetBuddy, { petReact } from '../pet/PetBuddy';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useProgress } from '../context/ProgressContext';
import { BASIC_STROKES, ORDER_TIPS } from '../writing/basics';
import CharacterPractice, { WriteMode } from '../writing/CharacterPractice';
import { ActivityIndicator } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { PracticeResult } from '../components/HelpSheet';
import { speechRefs, speechWords } from '../data/speechRefs';
import { Attempt, evaluateAttempt, pickCompetitors } from '../speech/evaluate';
import { useVoiceRecorder } from '../speech/useVoiceRecorder';
import { AncientGlyph } from '../components/AncientGlyph';
import { Button, Card, ProgressBar, SpeakButton, speakChinese } from '../components/ui';
import { Word } from '../data/lessons';
import { pictographs } from '../data/pictographs';
import { sentences } from '../data/sentences';
import { colors, radius } from '../theme';
import { shuffle } from '../utils';
import { Step, stepWords } from './steps';

type Feedback = { correct: boolean; main: string; sub?: string; extra?: string };

export type PlayerResult = { correct: number; total: number };

/**
 * Plays a list of lesson steps one by one, with a feedback bar after each answer.
 * Anything answered wrong is asked again at the end.
 */
export default function StepPlayer({
  steps,
  onClose,
  onFinish,
  onWordResult,
}: {
  steps: Step[];
  onClose: () => void;
  onFinish: (result: PlayerResult) => void;
  onWordResult: (wordId: string, correct: boolean) => void;
}) {
  const [queue, setQueue] = useState<Step[]>(steps);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [spoke, setSpoke] = useState(false); // tried the current speaking step
  const step = queue[index];

  const answer = (fb: Feedback, recordWords = true) => {
    setFeedback(fb);
    if (!step.kind || step.kind === 'intro') return;
    // learning a stroke or tracing a new character isn't scored
    if (step.kind === 'stroke' || (step.kind === 'write' && step.mode === 'learn')) return;
    petReact(fb.correct ? 'right' : 'wrong');
    if (!('retry' in step && step.retry)) {
      setScore((s) => ({ correct: s.correct + (fb.correct ? 1 : 0), total: s.total + 1 }));
    }
    if (recordWords) stepWords(step).forEach((w) => onWordResult(w.id, fb.correct));
  };

  const next = () => {
    let q = queue;
    if (feedback && !feedback.correct && step.kind !== 'intro' && !('retry' in step && step.retry)) {
      q = [...queue, { ...step, retry: true } as Step];
      setQueue(q);
    }
    setFeedback(null);
    setSpoke(false);
    if (index + 1 >= q.length) {
      petReact('done');
      onFinish(score);
    } else {
      setIndex(index + 1);
    }
  };

  const remaining = queue.length - index;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={(index + (feedback ? 1 : 0)) / queue.length} color={colors.jade} height={12} />
        </View>
        <Text style={styles.counter}>{remaining}</Text>
        <PetBuddy />
      </View>

      <ScrollView contentContainerStyle={styles.body} key={index} scrollEnabled={step.kind !== 'write' && step.kind !== 'stroke'}>
        {'retry' in step && step.retry && <Text style={styles.retryTag}>🔁 Let's try this one again</Text>}
        {step.kind === 'intro' && <IntroCard word={step.word} />}
        {step.kind === 'choice' && <ChoiceCard step={step} locked={!!feedback} onAnswer={answer} />}
        {step.kind === 'match' && (
          <MatchCard
            words={step.words}
            onWordResult={onWordResult}
            onDone={(perfect) =>
              answer({ correct: true, main: perfect ? 'All matched — perfect!' : 'All matched! Watch out for the ones you mixed up.' }, false)
            }
          />
        )}
        {step.kind === 'build' && <BuildCard step={step} locked={!!feedback} onAnswer={answer} />}
        {step.kind === 'fill' && <FillCard step={step} locked={!!feedback} onAnswer={answer} />}
        {step.kind === 'stroke' && <StrokeCard index={step.index} onAnswer={answer} />}
        {step.kind === 'write' && <WriteCard step={step} locked={!!feedback} onAnswer={answer} />}
        {step.kind === 'speak' && <SpeakCard word={step.word} onTried={() => setSpoke(true)} />}
      </ScrollView>

      {step.kind === 'intro' && !feedback && (
        <View style={styles.footer}>
          <Button title="Got it — continue" onPress={next} />
        </View>
      )}
      {step.kind === 'speak' && (
        <View style={styles.footer}>
          <Button title={spoke ? 'Continue' : 'Can’t talk now — skip'} variant={spoke ? 'success' : 'secondary'} onPress={next} />
        </View>
      )}
      {feedback && (
        <View style={[styles.footer, { backgroundColor: feedback.correct ? colors.jadeSoft : colors.wrongSoft }]}>
          <Text style={[styles.fbTitle, { color: feedback.correct ? colors.jade : colors.wrong }]}>
            {feedback.correct ? '✓ ' : '✕ '}
            {feedback.main}
          </Text>
          {feedback.sub ? <Text style={styles.fbSub}>{feedback.sub}</Text> : null}
          {feedback.extra ? <Text style={styles.fbExtra}>{feedback.extra}</Text> : null}
          <Button title="Continue" variant={feedback.correct ? 'success' : 'primary'} onPress={next} style={{ marginTop: 10 }} />
        </View>
      )}
    </View>
  );
}

/* ---------- Say it out loud ---------- */

const TONE_COLORS = ['#7A6E64', '#C8312B', '#E0A526', '#2E8B6E', '#3B6FB6', '#7A6E64'];

function SpeakCard({ word, onTried }: { word: Word; onTried: () => void }) {
  const { addXp } = useProgress();
  const sw = speechWords.find((s) => s.id === word.id);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [rewarded, setRewarded] = useState(false);

  const rec = useVoiceRecorder((samples, fileUri) => {
    if (!sw) return;
    const a = evaluateAttempt(samples, sw, speechRefs[sw.id], pickCompetitors(sw, speechWords, speechRefs));
    setAttempt(a);
    setUri(fileUri);
    onTried();
    const perfect = a.ok && a.tonesJudged > 0 && a.tonesRight === a.tonesJudged;
    petReact(perfect ? 'right' : 'wrong');
    if (perfect && !rewarded) {
      addXp(5);
      setRewarded(true);
    }
  }, 4);

  useEffect(() => {
    speakChinese(word.hanzi);
  }, [word.hanzi]);

  const playMine = () => {
    if (!uri) return;
    const p = createAudioPlayer({ uri });
    p.play();
    setTimeout(() => p.remove(), 6000);
  };

  return (
    <View>
      <Text style={styles.kicker}>SAY IT OUT LOUD 🎙️</Text>
      <Card style={styles.introCard}>
        <Text style={styles.introHanzi} adjustsFontSizeToFit numberOfLines={1}>
          {word.hanzi}
        </Text>
        <Text style={styles.introPinyin}>
          {sw
            ? sw.syllables.map((s, i) => (
                <Text key={i} style={{ color: TONE_COLORS[s.spoken] }}>
                  {s.py}
                  {i < sw.syllables.length - 1 ? ' ' : ''}
                </Text>
              ))
            : word.pinyin}
        </Text>
        <Text style={styles.introEnglish}>{word.english}</Text>
        <View style={styles.speakRow}>
          <SpeakButton text={word.hanzi} size={46} />
          <Text style={styles.speakHint}>Listen, then tap the mic and say it</Text>
        </View>
      </Card>

      <View style={{ alignItems: 'center', marginTop: 18 }}>
        <Pressable
          onPress={rec.toggle}
          style={({ pressed }) => [styles.mic, rec.state === 'recording' && styles.micOn, pressed && { opacity: 0.8 }]}
          accessibilityLabel={rec.state === 'recording' ? 'Stop recording' : 'Start recording'}
        >
          {rec.state === 'processing' ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <Text style={styles.micIcon}>{rec.state === 'recording' ? '■' : '🎙️'}</Text>
          )}
        </Pressable>
        <Text style={styles.micText}>
          {rec.state === 'recording' ? 'Listening… tap to stop' : rec.state === 'processing' ? 'Checking…' : attempt ? 'Tap to try again' : 'Tap and speak'}
        </Text>
        {rec.error && <Text style={styles.micError}>{rec.error}</Text>}
      </View>

      {attempt && rec.state === 'idle' && (
        <View style={{ marginTop: 6 }}>
          <PracticeResult a={attempt} />
          {uri && (
            <Pressable onPress={playMine} hitSlop={8} style={{ alignSelf: 'center', marginTop: 10 }}>
              <Text style={styles.link}>▶ Hear my voice</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

/* ---------- Learn a basic stroke ---------- */

function StrokeCard({ index, onAnswer }: { index: number; onAnswer: (fb: Feedback, recordWords?: boolean) => void }) {
  const { width } = useWindowDimensions();
  const b = BASIC_STROKES[index];
  const [mode, setMode] = useState<WriteMode>('watch');
  const [replay, setReplay] = useState(0);
  const size = Math.min(width - 100, 260);
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[styles.kicker, { alignSelf: 'flex-start' }]}>NEW STROKE · 笔画 bǐhuà</Text>
      <Pressable onPress={() => speakChinese(b.name)}>
        <Text style={styles.strokeName}>
          {b.name} <Text style={styles.strokePy}>{b.py}</Text>
        </Text>
      </Pressable>
      <Text style={styles.strokeEn}>{b.en} stroke</Text>
      <Text style={styles.strokeTip}>{b.tip}</Text>
      <CharacterPractice
        key={mode}
        char={b.char}
        mode={mode}
        only={b.stroke}
        size={size}
        replayKey={replay}
        onDone={() => {
          if (mode === 'watch') setTimeout(() => setMode('trace'), 700);
          else onAnswer({ correct: true, main: `You wrote ${b.name} ${b.py}!`, sub: `Shown inside ${b.char} — you'll see this stroke in lots of characters.` }, false);
        }}
      />
      {mode === 'trace' && (
        <Pressable
          onPress={() => {
            setMode('watch');
            setReplay((r) => r + 1);
          }}
          hitSlop={8}
        >
          <Text style={styles.link}>👀 Watch again</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ---------- Write a character ---------- */

function WriteCard({
  step,
  locked,
  onAnswer,
}: {
  step: Extract<Step, { kind: 'write' }>;
  locked: boolean;
  onAnswer: (fb: Feedback, recordWords?: boolean) => void;
}) {
  const { width, height } = useWindowDimensions();
  const { markWritten } = useProgress();
  const learn = step.mode === 'learn';
  const [mode, setMode] = useState<WriteMode>(learn ? 'watch' : 'write');
  const [replay, setReplay] = useState(0);
  const size = Math.min(width - 80, height * 0.38, 320);
  const { word, char } = step;
  const tip = ORDER_TIPS[char];

  const done = (mistakes: number) => {
    if (mode === 'watch') {
      if (learn && !locked) setTimeout(() => setMode('trace'), 700);
      return;
    }
    if (locked) return;
    if (learn) {
      onAnswer({ correct: true, main: mistakes === 0 ? 'Beautiful writing!' : 'Nice — you traced it!', sub: `${char} — you'll write it from memory later in this lesson.` }, false);
      return;
    }
    const ok = mistakes <= 2;
    if (ok) markWritten(char, mistakes === 0 ? 5 : 3);
    onAnswer(
      ok
        ? { correct: true, main: mistakes === 0 ? `Perfect ${char}!` : `You wrote ${char}!`, sub: `+${mistakes === 0 ? 5 : 3} XP` }
        : { correct: false, main: `${mistakes} mistakes on ${char}`, sub: 'It will come back for another try.' },
      false,
    );
  };

  const forgot = () => {
    setMode('watch');
    setReplay((r) => r + 1);
    onAnswer({ correct: false, main: 'No problem — watch how it’s written', sub: 'You’ll try it again at the end.' }, false);
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[styles.kicker, { alignSelf: 'flex-start' }]}>{learn ? 'LEARN TO WRITE' : 'WRITE FROM MEMORY'}</Text>
      <View style={styles.writeHead}>
        <Text style={styles.writeWord}>
          {[...word.hanzi].map((c, i) => (
            <Text key={i} style={c === char ? styles.writeTarget : undefined}>
              {learn || c !== char ? c : '?'}
            </Text>
          ))}
        </Text>
        <SpeakButton text={word.hanzi} size={38} />
      </View>
      <Text style={styles.writeSub}>
        {word.pinyin} · {word.english}
      </Text>
      {!learn && <Text style={styles.writeAsk}>Write the missing character ({word.english}) — no outline this time!</Text>}
      {learn && mode === 'trace' && tip && <Text style={styles.writeTip}>💡 {tip}</Text>}
      <CharacterPractice key={`${mode}-${replay}`} char={char} mode={mode} size={size} onDone={done} />
      {!locked && learn && mode === 'trace' && (
        <Pressable
          onPress={() => {
            setMode('watch');
            setReplay((r) => r + 1);
          }}
          hitSlop={8}
        >
          <Text style={styles.link}>👀 Watch again</Text>
        </Pressable>
      )}
      {!locked && !learn && (
        <Pressable onPress={forgot} hitSlop={8}>
          <Text style={styles.link}>🤔 I forgot — show me</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ---------- Meet a new word ---------- */

function IntroCard({ word }: { word: Word }) {
  const sentence = useSentence(word);
  const tips = useMemo(
    () => [...word.hanzi].map((ch) => pictographs.find((p) => p.hanzi === ch)).filter(Boolean),
    [word.hanzi],
  );
  useEffect(() => {
    speakChinese(word.hanzi);
  }, [word.hanzi]);

  return (
    <View>
      <Text style={styles.kicker}>NEW WORD</Text>
      <Card style={styles.introCard}>
        <Text style={styles.introHanzi} adjustsFontSizeToFit numberOfLines={1}>
          {word.hanzi}
        </Text>
        <Text style={styles.introPinyin}>{word.pinyin}</Text>
        <Text style={styles.introEnglish}>{word.english}</Text>
        <View style={{ marginTop: 14 }}>
          <SpeakButton text={word.hanzi} size={56} />
        </View>
      </Card>

      {tips.map((p) =>
        p ? (
          <Card key={p.hanzi} style={[styles.tipCard, { flexDirection: 'row', gap: 12 }]}>
            <AncientGlyph hanzi={p.hanzi} style={{ width: 64, height: 64, borderRadius: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>
                💡 Memory tip: {p.hanzi} = {p.english}
              </Text>
              <Text style={styles.tipText}>{p.story}</Text>
            </View>
          </Card>
        ) : null,
      )}

      {sentence && (
        <Card style={styles.sentenceCard}>
          <View style={styles.sentenceHead}>
            <Text style={styles.sentenceLabel}>EXAMPLE</Text>
            <SpeakButton text={sentence.zh} size={38} />
          </View>
          <Text style={styles.sentenceZh}>{sentence.zh}</Text>
          <Text style={styles.sentencePy}>{sentence.pinyin}</Text>
          <Text style={styles.sentenceEn}>{sentence.en}</Text>
        </Card>
      )}
    </View>
  );
}

function useSentence(word: Word) {
  return sentences[word.hanzi];
}

/** Pinyin for every sentence word, used to label the sentence-building tiles. */
const tokenPinyin: Record<string, string> = {};
Object.values(sentences).forEach((s) => s.tokens.forEach((t) => (tokenPinyin[t.zh] = tokenPinyin[t.zh] ?? t.py)));

/* ---------- Multiple choice (listen / meaning / characters / tones) ---------- */

function ChoiceCard({
  step,
  locked,
  onAnswer,
}: {
  step: Extract<Step, { kind: 'choice' }>;
  locked: boolean;
  onAnswer: (fb: Feedback) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const { word, mode } = step;

  useEffect(() => {
    if (mode === 'listen' || mode === 'tone') speakChinese(word.hanzi);
  }, [mode, word.hanzi]);

  const prompt =
    mode === 'listen'
      ? 'What do you hear?'
      : mode === 'en2zh'
        ? `Which one means “${word.english}”?`
        : mode === 'tone'
          ? 'Listen. Which pinyin has the right tones?'
          : 'What does this mean?';

  const choose = (opt: string) => {
    if (locked) return;
    setChosen(opt);
    const correct = opt === step.answer;
    if (mode !== 'listen' && mode !== 'tone') speakChinese(word.hanzi);
    onAnswer({
      correct,
      main: correct ? pick(['Correct!', 'Nice! 很好!', 'That’s right! 对了!']) : `Answer: ${step.answer}`,
      sub: `${word.hanzi} · ${word.pinyin} · ${word.english}`,
    });
  };

  const bigOptions = mode === 'en2zh';

  return (
    <View>
      <Text style={styles.prompt}>{prompt}</Text>
      <Card style={styles.promptCard}>
        {(mode === 'listen' || mode === 'tone') && <SpeakButton text={word.hanzi} size={84} />}
        {mode === 'tone' && <Text style={styles.promptHanzi}>{word.hanzi}</Text>}
        {mode === 'zh2en' && (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.promptHanzi}>{word.hanzi}</Text>
            <SpeakButton text={word.hanzi} size={40} />
          </View>
        )}
        {mode === 'en2zh' && <Text style={styles.promptEnglish}>{word.english}</Text>}
      </Card>
      <View style={bigOptions ? styles.grid : undefined}>
        {step.options.map((opt) => {
          const right = opt === step.answer;
          const picked = opt === chosen;
          const state = locked ? (right ? 'right' : picked ? 'wrong' : 'idle') : 'idle';
          return (
            <Pressable
              key={opt}
              onPress={() => choose(opt)}
              style={({ pressed }) => [
                styles.option,
                bigOptions && styles.optionHalf,
                state === 'right' && styles.optionRight,
                state === 'wrong' && styles.optionWrong,
                pressed && !locked && { opacity: 0.7 },
              ]}
            >
              <Text style={bigOptions ? styles.optionHanzi : mode === 'tone' ? styles.optionPinyin : styles.optionText}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ---------- Match pairs ---------- */

function MatchCard({
  words,
  onWordResult,
  onDone,
}: {
  words: Word[];
  onWordResult: (wordId: string, correct: boolean) => void;
  onDone: (perfect: boolean) => void;
}) {
  const left = useMemo(() => shuffle(words), [words]);
  const right = useMemo(() => shuffle(words), [words]);
  const [selLeft, setSelLeft] = useState<string | null>(null);
  const [selRight, setSelRight] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [missed, setMissed] = useState<string[]>([]);
  const [flash, setFlash] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!selLeft || !selRight) return;
    if (selLeft === selRight) {
      const w = words.find((x) => x.id === selLeft)!;
      speakChinese(w.hanzi);
      const nextMatched = [...matched, selLeft];
      setMatched(nextMatched);
      onWordResult(selLeft, !missed.includes(selLeft));
      if (nextMatched.length === words.length && !done) {
        setDone(true);
        onDone(missed.length === 0);
      }
    } else {
      setMissed((m) => Array.from(new Set([...m, selLeft, selRight])));
      setFlash([selLeft, selRight]);
      setTimeout(() => setFlash([]), 500);
    }
    setSelLeft(null);
    setSelRight(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selLeft, selRight]);

  const tile = (w: Word, side: 'l' | 'r') => {
    const isMatched = matched.includes(w.id);
    const selected = side === 'l' ? selLeft === w.id : selRight === w.id;
    const flashing = flash.includes(w.id);
    return (
      <Pressable
        key={w.id + side}
        disabled={isMatched}
        onPress={() => (side === 'l' ? setSelLeft(w.id) : setSelRight(w.id))}
        style={[
          styles.matchTile,
          selected && styles.matchSelected,
          isMatched && styles.matchDone,
          flashing && !isMatched && styles.optionWrong,
        ]}
      >
        <Text style={[side === 'l' ? styles.matchHanzi : styles.matchEnglish, isMatched && { color: colors.jade }]} numberOfLines={2}>
          {side === 'l' ? w.hanzi : w.english}
        </Text>
      </Pressable>
    );
  };

  return (
    <View>
      <Text style={styles.prompt}>Tap the matching pairs</Text>
      <View style={styles.matchCols}>
        <View style={styles.matchCol}>{left.map((w) => tile(w, 'l'))}</View>
        <View style={styles.matchCol}>{right.map((w) => tile(w, 'r'))}</View>
      </View>
    </View>
  );
}

/* ---------- Build a sentence from tiles ---------- */

function BuildCard({
  step,
  locked,
  onAnswer,
}: {
  step: Extract<Step, { kind: 'build' }>;
  locked: boolean;
  onAnswer: (fb: Feedback) => void;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const tileInfo = useMemo(() => step.tiles.map((zh) => ({ zh, py: tokenPinyin[zh] ?? '' })), [step.tiles]);

  const check = () => {
    const built = picked.map((i) => step.tiles[i]).join('');
    const target = step.sentence.tokens.map((t) => t.zh).join('');
    const correct = built === target;
    speakChinese(step.sentence.zh);
    onAnswer({
      correct,
      main: correct ? 'Perfect sentence!' : 'Not quite. The answer is:',
      sub: step.sentence.zh,
      extra: `${step.sentence.pinyin}\n${step.sentence.en}`,
    });
  };

  return (
    <View>
      <Text style={styles.prompt}>Build this sentence in Chinese</Text>
      <Card style={styles.buildPrompt}>
        <Text style={styles.buildEnglish}>“{step.sentence.en}”</Text>
      </Card>

      <View style={styles.answerArea}>
        {picked.length === 0 && <Text style={styles.answerHint}>Tap the words below in the right order</Text>}
        {picked.map((i, pos) => (
          <Pressable
            key={`${i}-${pos}`}
            disabled={locked}
            onPress={() => setPicked(picked.filter((_, p) => p !== pos))}
            style={[styles.wordTile, styles.wordTilePicked]}
          >
            <Text style={styles.wordTileZh}>{tileInfo[i].zh}</Text>
            <Text style={styles.wordTilePy}>{tileInfo[i].py}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.bank}>
        {tileInfo.map((t, i) => {
          const used = picked.includes(i);
          return (
            <Pressable
              key={i}
              disabled={used || locked}
              onPress={() => {
                speakChinese(t.zh);
                setPicked([...picked, i]);
              }}
              style={[styles.wordTile, used && styles.wordTileUsed]}
            >
              <Text style={[styles.wordTileZh, used && { color: 'transparent' }]}>{t.zh}</Text>
              <Text style={[styles.wordTilePy, used && { color: 'transparent' }]}>{t.py}</Text>
            </Pressable>
          );
        })}
      </View>

      {!locked && <Button title="Check" onPress={check} disabled={picked.length === 0} style={{ marginTop: 18 }} />}
    </View>
  );
}

/* ---------- Fill in the blank ---------- */

function FillCard({
  step,
  locked,
  onAnswer,
}: {
  step: Extract<Step, { kind: 'fill' }>;
  locked: boolean;
  onAnswer: (fb: Feedback) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const choose = (opt: string) => {
    if (locked) return;
    setChosen(opt);
    const correct = opt === step.answer;
    speakChinese(step.sentence.zh);
    onAnswer({
      correct,
      main: correct ? 'Correct!' : `Answer: ${step.answer}`,
      sub: step.sentence.zh,
      extra: `${step.sentence.pinyin}\n${step.sentence.en}`,
    });
  };

  return (
    <View>
      <Text style={styles.prompt}>Fill in the missing word</Text>
      <Card style={styles.fillCard}>
        <Text style={styles.fillSentence}>
          {step.sentence.tokens.map((t, i) =>
            i === step.blank ? (
              <Text key={i} style={styles.blank}>
                {locked ? ` ${step.answer} ` : ' ＿＿ '}
              </Text>
            ) : (
              <Text key={i}>{t.zh}</Text>
            ),
          )}
        </Text>
        <Text style={styles.fillEnglish}>{step.sentence.en}</Text>
      </Card>
      <View style={styles.grid}>
        {step.options.map((opt) => {
          const right = opt === step.answer;
          const picked = opt === chosen;
          return (
            <Pressable
              key={opt}
              onPress={() => choose(opt)}
              style={({ pressed }) => [
                styles.option,
                styles.optionHalf,
                locked && right && styles.optionRight,
                locked && picked && !right && styles.optionWrong,
                pressed && !locked && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.optionHanzi}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
  close: { fontSize: 22, color: colors.muted, fontWeight: '600' },
  counter: { color: colors.muted, fontWeight: '700', minWidth: 22, textAlign: 'right' },
  body: { padding: 20, paddingTop: 6, paddingBottom: 30 },
  retryTag: { fontSize: 13, fontWeight: '700', color: colors.gold, marginBottom: 8 },
  speakRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  speakHint: { fontSize: 13, color: colors.muted, flexShrink: 1 },
  mic: { width: 86, height: 86, borderRadius: 43, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  micOn: { backgroundColor: colors.wrong, transform: [{ scale: 1.08 }] },
  micIcon: { fontSize: 34, color: '#fff' },
  micText: { fontSize: 14, color: colors.muted, marginTop: 8, fontWeight: '600' },
  micError: { fontSize: 13, color: colors.wrong, marginTop: 6, textAlign: 'center' },
  strokeName: { fontSize: 44, color: colors.ink },
  strokePy: { fontSize: 20, color: colors.red, fontWeight: '700' },
  strokeEn: { fontSize: 14, color: colors.muted },
  strokeTip: { fontSize: 15, color: colors.ink, textAlign: 'center', marginVertical: 10, lineHeight: 21 },
  link: { fontSize: 15, fontWeight: '700', color: colors.red, marginTop: 4 },
  writeHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  writeWord: { fontSize: 34, color: colors.muted },
  writeTarget: { color: colors.red, fontWeight: '700' },
  writeSub: { fontSize: 14, color: colors.muted, marginBottom: 8 },
  writeAsk: { fontSize: 14, color: colors.ink, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  writeTip: { fontSize: 13, color: colors.ink, backgroundColor: colors.goldSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8, overflow: 'hidden' },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: colors.jade, marginBottom: 8 },
  introCard: { alignItems: 'center', paddingVertical: 28, borderRadius: radius.lg },
  introHanzi: { fontSize: 76, color: colors.ink, fontWeight: '500' },
  introPinyin: { fontSize: 26, color: colors.red, fontWeight: '700', marginTop: 6 },
  introEnglish: { fontSize: 20, color: colors.ink, marginTop: 4, textAlign: 'center' },
  tipCard: { marginTop: 14, backgroundColor: colors.goldSoft },
  tipTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  tipText: { fontSize: 14, color: colors.ink, marginTop: 4, lineHeight: 20 },
  sentenceCard: { marginTop: 14 },
  sentenceHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sentenceLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: colors.muted },
  sentenceZh: { fontSize: 24, color: colors.ink, marginTop: 6 },
  sentencePy: { fontSize: 15, color: colors.red, marginTop: 4 },
  sentenceEn: { fontSize: 15, color: colors.muted, marginTop: 2 },
  prompt: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: 14 },
  promptCard: { alignItems: 'center', justifyContent: 'center', minHeight: 140, marginBottom: 18, borderRadius: radius.lg, gap: 10 },
  promptHanzi: { fontSize: 56, color: colors.ink },
  promptEnglish: { fontSize: 28, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  option: {
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  optionHalf: { width: '48%', alignItems: 'center' },
  optionRight: { borderColor: colors.jade, backgroundColor: colors.jadeSoft },
  optionWrong: { borderColor: colors.wrong, backgroundColor: colors.wrongSoft },
  optionText: { fontSize: 18, color: colors.ink },
  optionHanzi: { fontSize: 30, color: colors.ink },
  optionPinyin: { fontSize: 22, color: colors.ink, fontWeight: '600' },
  matchCols: { flexDirection: 'row', gap: 12 },
  matchCol: { flex: 1, gap: 10 },
  matchTile: {
    minHeight: 64,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  matchSelected: { borderColor: colors.gold, backgroundColor: colors.goldSoft },
  matchDone: { borderColor: colors.jadeSoft, backgroundColor: colors.jadeSoft, opacity: 0.6 },
  matchHanzi: { fontSize: 26, color: colors.ink },
  matchEnglish: { fontSize: 15, color: colors.ink, textAlign: 'center' },
  buildPrompt: { marginBottom: 14 },
  buildEnglish: { fontSize: 20, fontWeight: '600', color: colors.ink },
  answerArea: {
    minHeight: 86,
    borderBottomWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.line,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  answerHint: { color: colors.muted, fontSize: 14 },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18, justifyContent: 'center' },
  wordTile: {
    borderWidth: 2,
    borderColor: colors.line,
    borderBottomWidth: 4,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  wordTilePicked: { borderColor: colors.gold },
  wordTileUsed: { backgroundColor: colors.line, borderColor: colors.line },
  wordTileZh: { fontSize: 22, color: colors.ink },
  wordTilePy: { fontSize: 11, color: colors.muted },
  fillCard: { marginBottom: 18, paddingVertical: 22 },
  fillSentence: { fontSize: 28, color: colors.ink, textAlign: 'center', lineHeight: 40 },
  blank: { color: colors.red, fontWeight: '700' },
  fillEnglish: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 8 },
  footer: { padding: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg },
  fbTitle: { fontSize: 18, fontWeight: '800' },
  fbSub: { fontSize: 20, color: colors.ink, marginTop: 4 },
  fbExtra: { fontSize: 14, color: colors.muted, marginTop: 2, lineHeight: 20 },
});
