import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { strokeData } from '../data/strokes';
import { colors } from '../theme';
import { checkNext, pathLength, Pt } from './strokeMatch';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const INK = '#2B2118';
const GUIDE = '#E5D3BF';
const FAINT = '#E9E0D6';
const HINT = '#E58A8A';

export type WriteMode = 'watch' | 'trace' | 'write';

const medianD = (m: Pt[]) => 'M ' + m.map((p) => `${p[0]} ${p[1]}`).join(' L ');

const MESSAGES = {
  backwards: 'Right stroke, wrong direction — start from the other end.',
  order: 'That’s a later stroke. Follow the order!',
  place: 'Good shape — now put it in the right spot.',
  shape: 'Not quite — try again!',
  tooShort: 'A bit short — draw the whole stroke.',
  hook: 'Don’t forget the hook ↩ — flick at the end of the stroke!',
} as const;

/**
 * One character on a practice grid.
 * watch: strokes are drawn one by one, in order · trace: write over a faint copy · write: from memory.
 * `only` limits practice to a single stroke (used to teach the basic strokes).
 */
export default function CharacterPractice({
  char,
  mode,
  size,
  only,
  replayKey = 0,
  onDone,
}: {
  char: string;
  mode: WriteMode;
  size: number;
  only?: number;
  replayKey?: number;
  onDone?: (mistakes: number) => void;
}) {
  const data = strokeData[char];
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const uid = useRef(Math.random().toString(36).slice(2)).current;
  const order = useMemo(() => (only !== undefined ? [only] : data ? data.m.map((_, i) => i) : []), [data, only]);
  const lengths = useMemo(() => (data ? data.m.map((m) => pathLength(m as Pt[])) : []), [data]);

  const [done, setDone] = useState<number[]>([]); // strokes shown in full
  const [animIdx, setAnimIdx] = useState<number | null>(null);
  const [hintIdx, setHintIdx] = useState<number | null>(null);
  const [drawn, setDrawn] = useState<Pt[]>([]);
  const [drawnBad, setDrawnBad] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const hintAnim = useRef(new Animated.Value(0)).current;
  const state = useRef({ next: 0, misses: 0, mistakes: 0, finished: false, drawing: [] as Pt[] });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  // reset whenever the character, mode or replay changes
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    anim.stopAnimation();
    state.current = { next: 0, misses: 0, mistakes: 0, finished: false, drawing: [] };
    setDone([]);
    setAnimIdx(null);
    setHintIdx(null);
    setDrawn([]);
    setMessage(mode === 'watch' ? null : mode === 'trace' ? 'Trace each stroke, starting at the green dot.' : 'Now write it from memory!');
    if (mode === 'watch' && data) {
      let i = 0;
      const playNext = () => {
        if (i >= order.length) {
          state.current.finished = true;
          onDoneRef.current?.(0);
          return;
        }
        const s = order[i];
        setAnimIdx(s);
        anim.setValue(0);
        Animated.timing(anim, {
          toValue: 1,
          duration: Math.min(1100, 350 + lengths[s] * 0.7),
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (!finished) return;
          setDone((d) => [...d, s]);
          setAnimIdx(null);
          i++;
          later(playNext, 220);
        });
      };
      later(playNext, 350);
    }
    return () => {
      timers.current.forEach(clearTimeout);
      anim.stopAnimation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char, mode, only, replayKey]);

  const showHint = (s: number) => {
    setHintIdx(s);
    hintAnim.setValue(0);
    Animated.timing(hintAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start(() =>
      later(() => setHintIdx(null), 500),
    );
  };

  const toBox = (x: number, y: number): Pt => [(x / size) * 1024, (y / size) * 1024];

  const finishStroke = () => {
    const st = state.current;
    const pts = st.drawing;
    if (!data || st.finished || pts.length === 0) return;
    const s = order[st.next];
    const medians = data.m as Pt[][];
    const r = only !== undefined ? checkNext(pts, [medians[s]], 0) : checkNext(pts, medians, s);
    if (r.ok) {
      st.next++;
      st.misses = 0;
      setDone((d) => [...d, s]);
      setDrawn([]);
      if (st.next >= order.length) {
        st.finished = true;
        setMessage(st.mistakes === 0 ? 'Perfect! ✨' : `Done! ${st.mistakes} mistake${st.mistakes === 1 ? '' : 's'}.`);
        onDoneRef.current?.(st.mistakes);
      } else {
        setMessage(order.length > 1 ? `✓ Stroke ${st.next} of ${order.length}` : '✓');
      }
      return;
    }
    st.misses++;
    st.mistakes++;
    setDrawnBad(true);
    later(() => {
      setDrawn([]);
      setDrawnBad(false);
    }, 450);
    const needHint = r.reason === 'backwards' || r.reason === 'order' || r.reason === 'hook' || st.misses >= (mode === 'trace' ? 2 : 3);
    setMessage((r.reason ? MESSAGES[r.reason] : MESSAGES.shape) + (needHint ? ' Watch the hint.' : ''));
    if (needHint) later(() => showHint(s), 300);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => mode !== 'watch' && !state.current.finished,
        onMoveShouldSetPanResponder: () => mode !== 'watch' && !state.current.finished,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const p = toBox(e.nativeEvent.locationX, e.nativeEvent.locationY);
          state.current.drawing = [p];
          setDrawnBad(false);
          setDrawn([p]);
        },
        onPanResponderMove: (e) => {
          const p = toBox(e.nativeEvent.locationX, e.nativeEvent.locationY);
          const d = state.current.drawing;
          const last = d[d.length - 1];
          if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 6) {
            state.current.drawing = [...d, p];
            setDrawn(state.current.drawing);
          }
        },
        onPanResponderRelease: finishStroke,
        onPanResponderTerminate: finishStroke,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, size, char, only, data],
  );

  if (!data) {
    return (
      <View style={[styles.box, { width: size, height: size, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: size * 0.6, color: INK }}>{char}</Text>
      </View>
    );
  }

  const next = order[state.current.next];
  const showStartDot = mode === 'trace' && !state.current.finished && next !== undefined && hintIdx === null;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.box, { width: size, height: size }]} {...pan.panHandlers}>
        <Svg width={size} height={size} viewBox="0 0 1024 1024" pointerEvents="none">
          <Defs>
            {data.s.map((d, i) => (
              <ClipPath key={i} id={`${uid}c${i}`}>
                <Path d={d} />
              </ClipPath>
            ))}
          </Defs>
          {/* 田 practice grid */}
          <Rect x={8} y={8} width={1008} height={1008} fill="#FFFDF9" stroke={GUIDE} strokeWidth={10} />
          <Line x1={512} y1={8} x2={512} y2={1016} stroke={GUIDE} strokeWidth={5} strokeDasharray="28 22" />
          <Line x1={8} y1={512} x2={1016} y2={512} stroke={GUIDE} strokeWidth={5} strokeDasharray="28 22" />
          <Line x1={8} y1={8} x2={1016} y2={1016} stroke={GUIDE} strokeWidth={3} strokeDasharray="14 24" />
          <Line x1={1016} y1={8} x2={8} y2={1016} stroke={GUIDE} strokeWidth={3} strokeDasharray="14 24" />

          {data.s.map((d, i) => {
            const isTarget = order.includes(i);
            if (done.includes(i)) return <Path key={i} d={d} fill={INK} />;
            if (!isTarget) return <Path key={i} d={d} fill={FAINT} opacity={0.6} />; // other strokes, for context
            if (mode === 'trace' || mode === 'watch') return <Path key={i} d={d} fill={FAINT} />;
            return null;
          })}

          {animIdx !== null && (
            <AnimatedPath
              d={medianD(data.m[animIdx] as Pt[])}
              stroke={INK}
              strokeWidth={170}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              clipPath={`url(#${uid}c${animIdx})`}
              strokeDasharray={[lengths[animIdx] + 200, lengths[animIdx] + 200]}
              strokeDashoffset={anim.interpolate({ inputRange: [0, 1], outputRange: [lengths[animIdx] + 200, 0] })}
            />
          )}
          {hintIdx !== null && (
            <AnimatedPath
              d={medianD(data.m[hintIdx] as Pt[])}
              stroke={HINT}
              strokeWidth={170}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              clipPath={`url(#${uid}c${hintIdx})`}
              strokeDasharray={[lengths[hintIdx] + 200, lengths[hintIdx] + 200]}
              strokeDashoffset={hintAnim.interpolate({ inputRange: [0, 1], outputRange: [lengths[hintIdx] + 200, 0] })}
            />
          )}

          {/* stroke numbers while watching */}
          {mode === 'watch' &&
            done.map((i) => {
              const [x, y] = data.m[i][0];
              return (
                <G key={`n${i}`}>
                  <Circle cx={x} cy={y} r={34} fill={colors.red} />
                  <SvgText x={x} y={y + 14} fontSize={40} fontWeight="bold" fill="#fff" textAnchor="middle">
                    {only !== undefined ? '1' : String(i + 1)}
                  </SvgText>
                </G>
              );
            })}

          {showStartDot && <Circle cx={data.m[next][0][0]} cy={data.m[next][0][1]} r={30} fill={colors.jade} opacity={0.85} />}

          {drawn.length > 1 && (
            <Polyline
              points={drawn.map((p) => `${p[0]},${p[1]}`).join(' ')}
              fill="none"
              stroke={drawnBad ? colors.wrong : '#5A4A3C'}
              strokeWidth={42}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.8}
            />
          )}
        </Svg>
      </View>
      <Text style={styles.message}>{message ?? ' '}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFFDF9' },
  message: { fontSize: 15, color: colors.ink, fontWeight: '600', marginTop: 10, textAlign: 'center', minHeight: 40, paddingHorizontal: 10 },
});
