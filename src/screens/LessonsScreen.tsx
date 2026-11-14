import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import PetBuddy from '../pet/PetBuddy';
import { useProgress } from '../context/ProgressContext';
import { LessonIcon } from '../components/lessonIcons';
import { Lesson, lessons, levels } from '../data/lessons';
import { colors } from '../theme';

/**
 * The lessons as a path that winds down the screen: one circle per lesson,
 * joined by a dotted trail, with a banner where each level begins.
 *
 * Finished lessons are green with a tick, the one to do next is ringed in red
 * and a little larger, and anything further off is faded. The point of the
 * shape is that you can see where you are without reading anything.
 */

const PAGE_PADDING = 20;
const NODE = 78;
const NODE_NOW = 92;
/** Space between one circle and the next. */
const STEP = 110;
/** Room at the top of the path for the first level's banner. */
const TOP_ROOM = 42;
/** The "GO" bubble sits above its circle, so that stop needs extra room. */
const GO_ROOM = 36;
/** The circle you are on is bigger, so the stop after it is nudged down too. */
const NOW_ROOM = 8;
/** Extra space opened up where a level banner goes. */
const LEVEL_GAP = 70;
/** Names are wider than the circles, so each stop is laid out this wide. */
const LABEL_W = 96;
/** Where the circles sit across the width, as a fraction, repeating. */
const WEAVE = [0.18, 0.52, 0.84, 0.52];

type Row = { lesson: Lesson; levelId: number; levelName: string; done: number; of: number };

/** Long titles get shortened to their first word; the circles are narrow. */
function shortName(title: string) {
  return title.length > 12 ? title.split(' ')[0] : title;
}

export default function LessonsScreen({ onOpenLesson }: { onOpenLesson: (id: string) => void }) {
  const { progress } = useProgress();
  const { width } = useWindowDimensions();
  const content = width - PAGE_PADDING * 2;

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const placed = new Set<string>();
    for (const level of levels) {
      for (const lesson of lessons) {
        if (!level.lessonIds.includes(lesson.id) || placed.has(lesson.id)) continue;
        placed.add(lesson.id);
        out.push({ lesson, levelId: level.id, levelName: level.name, done: 0, of: lesson.words.length });
      }
    }
    // a lesson that was never added to a level still belongs on the path
    for (const lesson of lessons) {
      if (placed.has(lesson.id)) continue;
      out.push({ lesson, levelId: 99, levelName: 'More', done: 0, of: lesson.words.length });
    }
    return out.map((r) => ({
      ...r,
      done: r.lesson.words.filter((w) => progress.learned.includes(w.id)).length,
    }));
  }, [progress.learned]);

  // the lesson to do next: the first one still holding a word you have not met
  const nowIndex = rows.findIndex((r) => r.done < r.of);
  const lastLevelDone = nowIndex >= 0 ? rows[nowIndex].levelId : Infinity;

  // walk down the page working out where each circle and banner sits
  const { nodes, banners, height } = useMemo(() => {
    const ns: { row: Row; x: number; y: number; i: number }[] = [];
    const bs: { label: string; y: number }[] = [];
    let y = NODE_NOW / 2 + 22 + TOP_ROOM;
    let lastLevel = -1;
    rows.forEach((row, i) => {
      if (i === 0) {
        // clear of the first circle, and of its bubble when that is where you are
        const top = y - NODE_NOW / 2 - (nowIndex === 0 ? 28 : 0) - 18;
        bs.push({ label: `LEVEL ${row.levelId} · ${row.levelName.toUpperCase()}`, y: top });
      }
      if (i > 0) {
        const levelChanged = row.levelId !== lastLevel;
        const prev = y;
        // the circle you are on is bigger and wears a bubble, so it needs room on both sides
        y += STEP + (levelChanged ? LEVEL_GAP : 0) + (i === nowIndex ? GO_ROOM : 0) + (i - 1 === nowIndex ? NOW_ROOM : 0);
        if (levelChanged) {
          bs.push({ label: `LEVEL ${row.levelId} · ${row.levelName.toUpperCase()}`, y: (prev + y) / 2 });
        }
      }
      lastLevel = row.levelId;
      const half = LABEL_W / 2;
      const x = Math.min(Math.max(WEAVE[i % WEAVE.length] * content, half), content - half);
      ns.push({ row, x, y, i });
    });
    return { nodes: ns, banners: bs, height: y + NODE / 2 + 36 };
  }, [rows, nowIndex, content]);

  // one smooth curve threaded through the circles
  const trail = nodes
    .map((n, i) => {
      if (i === 0) return `M${n.x} ${n.y}`;
      const p = nodes[i - 1];
      const mid = (p.y + n.y) / 2;
      return ` C${p.x} ${mid} ${n.x} ${mid} ${n.x} ${n.y}`;
    })
    .join('');

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Lessons</Text>
        <PetBuddy size={56} />
      </View>

      <View style={{ height, width: content }}>
        <Svg width={content} height={height} style={StyleSheet.absoluteFill}>
          <Path d={trail} fill="none" stroke={colors.line} strokeWidth={12} strokeLinecap="round" strokeDasharray={[2, 20]} />
        </Svg>

        {banners.map((b) => (
          <View key={b.label} style={[styles.banner, { top: b.y - 16 }]}>
            <View style={styles.bannerLine} />
            <View style={styles.bannerChip}>
              <Text style={styles.bannerText}>{b.label}</Text>
            </View>
            <View style={styles.bannerLine} />
          </View>
        ))}

        {nodes.map(({ row, x, y, i }) => {
          const complete = row.done === row.of;
          const now = i === nowIndex;
          const size = now ? NODE_NOW : NODE;
          const faded = !complete && !now && row.levelId > lastLevelDone;
          return (
            <Pressable
              key={row.lesson.id}
              onPress={() => onOpenLesson(row.lesson.id)}
              accessibilityLabel={`${row.lesson.title}, ${complete ? 'finished' : `${row.done} of ${row.of} words`}`}
              style={({ pressed }) => [
                styles.node,
                { left: x - LABEL_W / 2, top: y - size / 2, opacity: faded ? 0.55 : pressed ? 0.7 : 1 },
              ]}
            >
              {now && (
                <View style={styles.goBubble}>
                  <Text style={styles.goText}>
                    {row.done}/{row.of} · GO
                  </Text>
                </View>
              )}
              <View>
                <View
                  style={[
                    styles.circle,
                    now && styles.circleNow,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      borderColor: complete ? colors.jade : now ? colors.red : colors.line,
                      backgroundColor: complete ? colors.jadeSoft : colors.card,
                    },
                  ]}
                >
                  <LessonIcon id={row.lesson.id} size={Math.round(size * 0.66)} fallback={row.lesson.emoji} />
                </View>
                {complete && (
                  <View style={styles.tick}>
                    <Text style={styles.tickText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={styles.nodeLabel} numberOfLines={1}>
                {shortName(row.lesson.title)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: PAGE_PADDING, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 30, fontWeight: '800', color: colors.ink },

  banner: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerLine: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  bannerChip: {
    backgroundColor: colors.goldSoft,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  bannerText: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.ink },

  node: { position: 'absolute', width: LABEL_W, alignItems: 'center' },
  circle: { borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  circleNow: { borderWidth: 5 },
  tick: {
    position: 'absolute',
    right: -3,
    top: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.jade,
    borderWidth: 3,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  goBubble: {
    position: 'absolute',
    top: -28,
    backgroundColor: colors.red,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  goText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  nodeLabel: { fontSize: 12, fontWeight: '800', color: colors.ink, marginTop: 6, textAlign: 'center' },
});
