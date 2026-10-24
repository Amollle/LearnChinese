import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { ACC_ORDER, pandaArt, Shape, UNDER_ORDER } from './pandaArt';
import { Mood } from './petLogic';

function draw(s: Shape, key: number) {
  const a = s.a as Record<string, any>;
  if (s.t === 'circle') return <Circle key={key} {...a} />;
  if (s.t === 'ellipse') return <Ellipse key={key} {...a} />;
  return <Path key={key} {...a} />;
}

/** The panda drawing, with a face for its mood and whatever it is wearing. Gently bounces. */
export default function Panda({
  mood,
  wearing = [],
  size = 200,
  onPress,
  bounce = true,
  chewing = false,
  style,
}: {
  mood: Mood;
  wearing?: string[];
  size?: number;
  onPress?: () => void;
  bounce?: boolean;
  /** mouth opens and closes, as if eating */
  chewing?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useRef(new Animated.Value(0)).current;
  const squish = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!bounce) return;
    const speed = mood === 'happy' ? 700 : mood === 'okay' ? 1100 : 1700;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: speed, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: speed, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce, mood, t]);

  const [chewFrame, setChewFrame] = useState(0);
  useEffect(() => {
    if (!chewing) return;
    const t = setInterval(() => setChewFrame((f) => 1 - f), 170);
    return () => clearInterval(t);
  }, [chewing]);
  const face = chewing ? (chewFrame ? 'chew1' : 'chew2') : mood;

  const press = () => {
    squish.setValue(0.9);
    Animated.spring(squish, { toValue: 1, friction: 3, tension: 140, useNativeDriver: true }).start();
    onPress?.();
  };

  const lift = mood === 'happy' ? -8 : mood === 'okay' ? -4 : -2;
  const shapes = [
    ...pandaArt.baseBack,
    ...UNDER_ORDER.filter((a) => wearing.includes(a)).flatMap((a) => pandaArt.under[a]),
    ...pandaArt.baseFront,
    ...pandaArt.extra[face],
    ...pandaArt.eyes[face],
    ...pandaArt.mouth[face],
    ...ACC_ORDER.filter((a) => wearing.includes(a)).flatMap((a) => pandaArt.acc[a]),
  ];

  return (
    <Pressable onPress={onPress ? press : undefined} disabled={!onPress} style={style} accessibilityLabel="Your panda">
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, lift] }) }, { scale: squish }],
        }}
      >
        <Svg width={size} height={size} viewBox="0 -4 200 204">
          {shapes.map(draw)}
        </Svg>
      </Animated.View>
    </Pressable>
  );
}
