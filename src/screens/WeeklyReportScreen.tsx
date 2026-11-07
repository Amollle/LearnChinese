import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ProgressBar } from '../components/ui';
import { todayKey, useProgress } from '../context/ProgressContext';
import { allWords } from '../data/lessons';
import { playChinese } from '../services/audio';
import { aiConfigured, AiUnavailable, getWeeklyReport } from '../services/ai';
import { reportIsStale, weekStats } from '../services/weekStats';
import { colors } from '../theme';

/**
 * The week in review: the numbers the app has been quietly keeping, plus a
 * written report from the AI coach.
 *
 * The numbers are worked out on the phone, so this screen is useful offline
 * and before free talk is ever set up — the AI only adds the words.
 */
export default function WeeklyReportScreen({ onClose }: { onClose: () => void }) {
  const { progress, saveWeeklyReport, addCoachWords } = useProgress();
  const stats = useMemo(() => weekStats(progress, allWords), [progress]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const report = progress.weeklyReport;
  const stale = reportIsStale(progress);

  const write = async () => {
    setBusy(true);
    setError(null);
    try {
      const known = progress.learned
        .map((id) => allWords.find((w) => w.id === id)?.hanzi)
        .filter((h): h is string => Boolean(h));
      const r = await getWeeklyReport({ stats, known });
      saveWeeklyReport({ ...r, madeOn: todayKey() });
      // the words it picked go straight into the review list, like the talk coach's
      if (r.practise.length) {
        addCoachWords(r.practise.map((w) => ({ ...w, addedAt: Date.now() })));
      }
    } catch (e) {
      setError(e instanceof AiUnavailable ? e.message : 'Something went wrong writing the report.');
    } finally {
      setBusy(false);
    }
  };

  const xpChange = stats.xpThisWeek - stats.xpLastWeek;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.back}>‹ Home</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Your week</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <Stat value={`${stats.daysActive}/7`} label="days practised" emoji="📅" />
          <Stat value={`${stats.xpThisWeek}`} label="XP this week" emoji="⭐" />
          <Stat value={`${stats.newWordsThisWeek}`} label="new words" emoji="✨" />
        </View>

        {stats.xpLastWeek > 0 && (
          <Text style={styles.compare}>
            {xpChange >= 0
              ? `That’s ${xpChange} XP more than last week 📈`
              : `That’s ${Math.abs(xpChange)} XP less than last week — an easy one to beat 💪`}
          </Text>
        )}

        {stats.accuracy !== null && (
          <Card style={styles.block}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Answers you got right</Text>
              <Text style={styles.muted}>{stats.accuracy}%</Text>
            </View>
            <ProgressBar
              value={stats.accuracy / 100}
              color={stats.accuracy >= 80 ? colors.jade : colors.gold}
              height={10}
            />
            <Text style={[styles.muted, { marginTop: 8 }]}>
              Out of {stats.answered} question{stats.answered === 1 ? '' : 's'} in reviews and quizzes.
            </Text>
          </Card>
        )}

        <Card style={styles.block}>
          <Text style={styles.cardTitle}>Where your words are</Text>
          <Text style={[styles.muted, { marginTop: 6, lineHeight: 20 }]}>
            You know {stats.wordsKnown} of {stats.totalWords} words. {stats.solidCount} have really stuck, and{' '}
            {stats.shakyCount} are still settling in.
          </Text>
        </Card>

        {stats.shaky.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>STILL SETTLING IN</Text>
            <Card style={styles.block}>
              {stats.shaky.map((w, i) => (
                <Pressable
                  key={w.zh}
                  onPress={() => playChinese(w.zh)}
                  style={[styles.wordRow, i === stats.shaky.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <Text style={styles.wordZh}>{w.zh}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wordPy}>{w.py}</Text>
                    <Text style={styles.muted}>{w.en}</Text>
                  </View>
                  <Text style={styles.speaker}>🔊</Text>
                </Pressable>
              ))}
            </Card>
          </>
        )}

        <Text style={styles.sectionLabel}>WHAT YOUR COACH THINKS</Text>

        {!aiConfigured ? (
          <Card style={styles.block}>
            <Text style={styles.muted}>
              The written report needs the same setup as free talk. The numbers above work without it.
            </Text>
          </Card>
        ) : report ? (
          <>
            <Card style={[styles.block, styles.reportCard]}>
              <Text style={styles.headline}>{report.headline}</Text>
              <Text style={styles.summary}>{report.summary}</Text>
            </Card>

            {report.wins.length > 0 && (
              <Card style={styles.block}>
                <Text style={styles.cardTitle}>👏 Went well</Text>
                {report.wins.map((w) => (
                  <Text key={w} style={styles.bullet}>
                    • {w}
                  </Text>
                ))}
              </Card>
            )}

            {report.focus.length > 0 && (
              <Card style={styles.block}>
                <Text style={styles.cardTitle}>🎯 Worth your time next</Text>
                {report.focus.map((f) => (
                  <Text key={f} style={styles.bullet}>
                    • {f}
                  </Text>
                ))}
              </Card>
            )}

            {!!report.tip && (
              <Card style={[styles.block, styles.tipCard]}>
                <Text style={styles.tipLabel}>TRY THIS WEEK</Text>
                <Text style={styles.tipText}>{report.tip}</Text>
              </Card>
            )}

            {report.practise.length > 0 && (
              <Text style={styles.note}>
                {report.practise.length} word{report.practise.length === 1 ? '' : 's'} from this report went into
                your review list.
              </Text>
            )}

            <Text style={styles.note}>Written on {report.madeOn}.</Text>
          </>
        ) : (
          <Card style={styles.block}>
            <Text style={styles.muted}>
              Your coach hasn’t written anything yet. It reads the numbers above and tells you what they mean.
            </Text>
          </Card>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        {aiConfigured &&
          (busy ? (
            <View style={styles.busy}>
              <ActivityIndicator color={colors.red} />
              <Text style={styles.muted}>Reading your week…</Text>
            </View>
          ) : (
            <Button
              title={report ? 'Write a new report' : 'Ask my coach to write it'}
              onPress={write}
              variant={report && !stale ? 'secondary' : 'primary'}
              style={{ marginTop: 18 }}
            />
          ))}
      </ScrollView>
    </View>
  );
}

function Stat({ value, label, emoji }: { value: string; label: string; emoji: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  back: { fontSize: 17, color: colors.red, fontWeight: '700', width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  container: { padding: 20, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 4 },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2, textAlign: 'center' },
  compare: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 12 },
  block: { marginTop: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 14, color: colors.muted },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginTop: 22 },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  wordZh: { fontSize: 26, color: colors.ink, fontWeight: '600', minWidth: 58 },
  wordPy: { fontSize: 15, color: colors.red, fontWeight: '600' },
  speaker: { fontSize: 20 },
  reportCard: { backgroundColor: colors.jade },
  headline: { fontSize: 22, fontWeight: '800', color: '#fff' },
  summary: { fontSize: 15, color: '#E1F2EC', marginTop: 8, lineHeight: 22 },
  bullet: { fontSize: 15, color: colors.ink, marginTop: 8, lineHeight: 21 },
  tipCard: { backgroundColor: colors.goldSoft, borderWidth: 2, borderColor: colors.gold },
  tipLabel: { fontSize: 11, fontWeight: '800', color: '#9A6B00', letterSpacing: 0.5 },
  tipText: { fontSize: 16, color: colors.ink, marginTop: 6, lineHeight: 22, fontWeight: '600' },
  note: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 14, lineHeight: 19 },
  error: { fontSize: 14, color: colors.wrong, textAlign: 'center', marginTop: 16, lineHeight: 20 },
  busy: { alignItems: 'center', gap: 10, marginTop: 22 },
});
