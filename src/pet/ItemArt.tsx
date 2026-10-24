import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { ArtPart, itemArt, Shape } from './itemPictures';

function draw(s: Shape, key: number) {
  const a = s.a as Record<string, any>;
  if (s.t === 'circle') return <Circle key={key} {...a} />;
  if (s.t === 'ellipse') return <Ellipse key={key} {...a} />;
  if (s.t === 'rect') return <Rect key={key} {...a} />;
  return <Path key={key} {...a} />;
}

/** A cartoon picture of a shop item, with moving parts (beads swing, steam rises, the ball spins…). */
export default function ItemArt({ id, size, emoji, animate = true }: { id: string; size: number; emoji?: string; animate?: boolean }) {
  const art = itemArt[id];
  if (!art) return <Text style={{ fontSize: size * 0.7, width: size, textAlign: 'center' }}>{emoji ?? '❓'}</Text>;
  const [x0, y0, w, h] = (art.vb ?? '0 0 100 100').split(' ').map(Number);
  const k = Math.min(size / w, size / h);
  const offX = (size - w * k) / 2;
  const offY = (size - h * k) / 2;
  return (
    <View style={{ width: size, height: size }}>
      {art.base.length > 0 && (
        <Svg width={size} height={size} viewBox={art.vb ?? '0 0 100 100'} style={{ position: 'absolute' }}>
          {art.base.map(draw)}
        </Svg>
      )}
      {art.parts.map((p, i) => (
        <MovingPart key={i} part={p} size={size} k={k} left={offX + (p.pivot[0] - x0) * k} top={offY + (p.pivot[1] - y0) * k} animate={animate} />
      ))}
    </View>
  );
}

/** One moving part, drawn in a box centred on its pivot so it can swing or spin around that point. */
function MovingPart({ part, size, k, left, top, animate }: { part: ArtPart; size: number; k: number; left: number; top: number; animate: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) return;
    const lin = Easing.linear;
    const io = Easing.inOut(Easing.sin);
    const t = (to: number, ms: number, e = io) => Animated.timing(v, { toValue: to, duration: ms, easing: e, useNativeDriver: true });
    let loop: Animated.CompositeAnimation;
    if (part.motion === 'spin' || part.motion === 'steam' || part.motion === 'twinkle') {
      loop = Animated.loop(Animated.sequence([t(1, part.ms, part.motion === 'spin' ? lin : io), t(0, 0, lin)]));
    } else {
      loop = Animated.loop(Animated.sequence([t(1, part.ms / 2), t(-1, part.ms), t(0, part.ms / 2)]));
    }
    const d = setTimeout(() => loop.start(), part.delay);
    return () => {
      clearTimeout(d);
      loop.stop();
    };
  }, [animate, part, v]);

  const half = size; // the part's box is 2×size, centred on the pivot
  let transform: any[] = [];
  let opacity: any = 1;
  switch (part.motion) {
    case 'swing':
    case 'wobble':
      transform = [{ rotate: v.interpolate({ inputRange: [-1, 1], outputRange: [`${-part.amp}deg`, `${part.amp}deg`] }) }];
      break;
    case 'spin':
      transform = [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }];
      break;
    case 'bob':
      transform = [{ translateY: v.interpolate({ inputRange: [-1, 1], outputRange: [part.amp * k, -part.amp * k] }) }];
      break;
    case 'flip':
      transform = [{ scaleY: v }];
      break;
    case 'steam':
      transform = [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -part.amp * k] }) }];
      opacity = v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.9, 0.6, 0] });
      break;
    case 'twinkle':
      transform = [{ scale: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1.2, 0.3] }) }];
      opacity = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 1, 0.2] });
      break;
  }
  const [px, py] = part.pivot;
  const span = (2 * half) / k;
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: left - half, top: top - half, width: 2 * half, height: 2 * half, opacity: animate ? opacity : 1, transform: animate ? transform : [] }}
    >
      <Svg width={2 * half} height={2 * half} viewBox={`${px - span / 2} ${py - span / 2} ${span} ${span}`}>
        {part.shapes.map(draw)}
      </Svg>
    </Animated.View>
  );
}
