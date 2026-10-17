import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { ancientGlyphs } from '../data/ancientGlyphs';

export const BONE = '#EBDDC2';
export const INK = '#7A2E12';

/** An oracle-bone-style drawing of a character, on a bone-coloured background. */
export function AncientGlyph({
  hanzi,
  style,
  strokeWidth = 5,
  color = INK,
  background = BONE,
}: {
  hanzi: string;
  style?: StyleProp<ViewStyle>;
  strokeWidth?: number;
  color?: string;
  background?: string;
}) {
  const strokes = ancientGlyphs[hanzi];
  if (!strokes) return <View style={[{ backgroundColor: background }, style]} />;
  return (
    <View style={[{ backgroundColor: background, overflow: 'hidden' }, style]}>
      <Svg width="100%" height="100%" viewBox="-8 -8 116 116" preserveAspectRatio="xMidYMid meet">
        {/* faint cracks, like on a real oracle bone */}
        <Path d="M-8 30 C 20 34, 30 22, 52 28 S 90 18, 116 26" stroke="#D8C6A6" strokeWidth={1.2} fill="none" />
        <Path d="M70 116 C 74 92, 66 84, 78 70" stroke="#D8C6A6" strokeWidth={1} fill="none" />
        <Rect x={-8} y={-8} width={116} height={116} fill="none" />
        {strokes.map((s, i) => {
          const [x, y, sx, sy] = s.t ?? [0, 0, 1, 1];
          return (
            <G key={i} transform={`translate(${x} ${y}) scale(${sx} ${sy})`}>
              <Path
                d={s.d}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth / ((sx + sy) / 2)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
