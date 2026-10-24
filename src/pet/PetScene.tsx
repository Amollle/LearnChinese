import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import ItemArt from './ItemArt';
import { PetItem } from './petLogic';

/** Little animated scenes for feeding, playing and dressing up the panda. */
export type SceneKind = 'eat' | 'bounce' | 'kick' | 'fly' | 'jump' | 'spin' | 'shake' | 'orbit' | 'twirl';
export type Scene = { id: number; kind: SceneKind; item: PetItem };

const TOY_SCENES: Record<string, SceneKind> = {
  ball: 'bounce',
  jianzi: 'kick',
  kite: 'fly',
  jumprope: 'jump',
  diabolo: 'spin',
  rattle: 'shake',
  tangram: 'orbit',
};

export function sceneFor(item: PetItem): SceneKind {
  if (item.kind === 'food') return 'eat';
  if (item.kind === 'toy') return TOY_SCENES[item.id] ?? 'orbit';
  return 'twirl';
}

/** How long each scene lasts (ms). */
export const SCENE_MS: Record<SceneKind, number> = {
  eat: 2100,
  bounce: 2000,
  kick: 2100,
  fly: 2600,
  jump: 1900,
  spin: 2200,
  shake: 1900,
  orbit: 2000,
  twirl: 1300,
};

const t = (v: Animated.Value, toValue: number, duration: number, easing = Easing.inOut(Easing.quad)) =>
  Animated.timing(v, { toValue, duration, easing, useNativeDriver: true });
const repeat = (n: number, anim: () => Animated.CompositeAnimation) => Animated.sequence(Array.from({ length: n }, anim));

/** Moves the whole panda: hops, sways and twirls. */
export function usePandaMotion() {
  const y = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0)).current; // degrees
  const sx = useRef(new Animated.Value(1)).current;

  const play = (kind: SceneKind) => {
    y.setValue(0);
    rot.setValue(0);
    sx.setValue(1);
    let a: Animated.CompositeAnimation | null = null;
    if (kind === 'jump') a = repeat(4, () => Animated.sequence([t(y, -42, 190, Easing.out(Easing.quad)), t(y, 0, 190, Easing.in(Easing.quad))]));
    else if (kind === 'kick') a = repeat(3, () => Animated.sequence([t(y, -12, 160), t(y, 0, 160), Animated.delay(380)]));
    else if (kind === 'bounce') a = repeat(3, () => Animated.sequence([t(y, -6, 160), t(y, 0, 160), Animated.delay(330)]));
    else if (kind === 'shake' || kind === 'spin') a = repeat(4, () => Animated.sequence([t(rot, 6, 220), t(rot, -6, 220)]));
    else if (kind === 'fly') a = Animated.sequence([Animated.delay(500), t(rot, -8, 500), Animated.delay(900), t(rot, 0, 400)]);
    else if (kind === 'eat') a = Animated.sequence([Animated.delay(600), repeat(4, () => Animated.sequence([t(y, -3, 150), t(y, 0, 150)]))]);
    else if (kind === 'twirl')
      a = Animated.parallel([
        Animated.sequence([t(sx, -1, 300), t(sx, 1, 300), t(sx, -1, 300), t(sx, 1, 300)]),
        Animated.sequence([t(y, -22, 300, Easing.out(Easing.quad)), Animated.delay(600), t(y, 0, 300, Easing.in(Easing.quad))]),
      ]);
    else if (kind === 'orbit') a = Animated.sequence([t(y, -10, 200), t(y, 0, 200), Animated.delay(1200), t(y, -16, 200), t(y, 0, 200)]);
    a?.start(() => rot.setValue(0));
  };

  const style = {
    transform: [{ translateY: y }, { rotate: rot.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) }, { scaleX: sx }],
  };
  return { play, style };
}

/**
 * The item's part of the scene, drawn over the panda (a box the same size as the panda drawing).
 * Positions are in the panda's own picture: mouth ≈ (103, 119), hands ≈ (46/160, 167), feet ≈ (103, 195).
 */
export function SceneItem({ scene, size }: { scene: Scene; size: number }) {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const s = useRef(new Animated.Value(1)).current;
  const r = useRef(new Animated.Value(0)).current;
  const o = useRef(new Animated.Value(1)).current;
  const k = size / 210;
  const { kind, item } = scene;

  // where the emoji starts, in the panda box
  const start =
    kind === 'eat' || kind === 'orbit' ? { left: 103, top: 119 } : kind === 'jump' ? { left: 103, top: 110 } : kind === 'kick' ? { left: 103, top: 192 } : kind === 'spin' ? { left: 103, top: 150 } : kind === 'twirl' ? { left: 103, top: 60 } : { left: 160, top: 160 };

  useEffect(() => {
    let a: Animated.CompositeAnimation;
    switch (kind) {
      case 'eat':
        // fly up from the shop to the mouth, then shrink bite by bite
        y.setValue(260 * k);
        s.setValue(1.3);
        a = Animated.sequence([
          Animated.parallel([t(y, 0, 600, Easing.out(Easing.cubic)), t(s, 1, 600)]),
          t(s, 0.72, 120),
          Animated.delay(280),
          t(s, 0.45, 120),
          Animated.delay(280),
          t(s, 0.2, 120),
          Animated.delay(280),
          Animated.parallel([t(s, 0, 150), t(o, 0, 150)]),
        ]);
        break;
      case 'bounce':
        a = repeat(3, () => Animated.sequence([Animated.parallel([t(y, -95 * k, 320, Easing.out(Easing.quad)), t(r, 180, 320)]), Animated.parallel([t(y, 0, 320, Easing.in(Easing.quad)), t(r, 360, 320)]), t(r, 0, 1)]));
        break;
      case 'kick':
        a = repeat(3, () => Animated.sequence([Animated.parallel([t(y, -175 * k, 350, Easing.out(Easing.quad)), t(r, 200, 350)]), Animated.parallel([t(y, 0, 350, Easing.in(Easing.quad)), t(r, 0, 350)])]));
        break;
      case 'fly':
        a = Animated.sequence([
          Animated.parallel([t(y, -170 * k, 900, Easing.out(Easing.cubic)), t(x, -60 * k, 900), t(s, 1.3, 900)]),
          repeat(3, () => Animated.sequence([Animated.parallel([t(x, -35 * k, 250), t(r, 18, 250)]), Animated.parallel([t(x, -80 * k, 250), t(r, -18, 250)])])),
          t(o, 0, 200),
        ]);
        break;
      case 'jump':
        // the rope's own picture swings over the panda on every hop
        a = Animated.delay(1900);
        break;
      case 'spin':
        a = Animated.parallel([
          repeat(3, () => Animated.sequence([t(x, -40 * k, 350), t(x, 40 * k, 350)])),
          Animated.sequence([t(y, -70 * k, 600), Animated.delay(900), t(y, 0, 600)]),
        ]);
        break;
      case 'shake':
        a = repeat(8, () => Animated.sequence([t(r, 28, 110), t(r, -28, 110)]));
        break;
      case 'twirl':
        o.setValue(0);
        a = Animated.sequence([
          Animated.parallel([t(o, 1, 200), t(s, 1.6, 600)]),
          Animated.parallel([t(o, 0, 500), t(y, -40 * k, 500)]),
        ]);
        break;
      default: {
        // orbit around the panda, then pop
        const path = [
          [0, -95],
          [85, -40],
          [85, 40],
          [0, 75],
          [-85, 40],
          [-85, -40],
          [0, -95],
        ];
        a = Animated.sequence([
          ...path.map(([px, py]) => Animated.parallel([t(x, px * k, 230, Easing.linear), t(y, py * k, 230, Easing.linear), t(r, 0, 1)])),
          Animated.parallel([t(s, 1.8, 250), t(o, 0, 250)]),
        ]);
      }
    }
    a.start();
    return () => a.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id]);

  // the jump rope is drawn big, around the whole panda
  const artSize = kind === 'jump' ? 190 * k : 48;
  const extra = kind === 'shake' ? ['🎵', '🎶'] : kind === 'twirl' ? ['✨', '✨', '✨'] : [];

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill]}>
      <Animated.View
        style={[
          styles.emoji,
          {
            left: start.left * k - artSize / 2,
            top: start.top * k - artSize / 2,
            width: artSize,
            height: artSize,
            opacity: o,
            transform: [{ translateX: x }, { translateY: y }, { rotate: r.interpolate({ inputRange: [-360, 1440], outputRange: ['-360deg', '1440deg'] }) }, { scale: s }],
          },
        ]}
      >
        {kind === 'twirl' ? <Text style={{ fontSize: 36, textAlign: 'center' }}>✨</Text> : <ItemArt id={item.id} emoji={item.emoji} size={artSize} />}
      </Animated.View>
      {extra.map((e, i) => (
        <Notes key={i} emoji={e} delay={i * 450} left={(kind === 'twirl' ? [40, 170, 105][i] : 175) * k} top={(kind === 'twirl' ? [70, 80, 20][i] : 140) * k} />
      ))}
    </View>
  );
}

function Notes({ emoji, delay, left, top }: { emoji: string; delay: number; left: number; top: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.sequence([Animated.delay(delay), t(v, 1, 1100, Easing.out(Easing.quad))]);
    a.start();
    return () => a.stop();
  }, [delay, v]);
  return (
    <Animated.Text
      style={[
        styles.note,
        {
          left,
          top,
          opacity: v.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) }, { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.2, 1] }) }],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  emoji: { position: 'absolute', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  note: { position: 'absolute', fontSize: 24 },
});
