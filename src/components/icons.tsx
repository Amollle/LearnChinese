import React from 'react';
import Svg, { Circle, G, Rect } from 'react-native-svg';
import { colors } from '../theme';

/**
 * Hand-drawn icons, so the app does not depend on how a particular phone
 * happens to render an emoji. Each one is a plain SVG sized by `size` and
 * tinted by `color`, like a piece of text.
 */

const TEETH = [0, 45, 90, 135, 180, 225, 270, 315];

/** A cog wheel: a thick ring with eight teeth and an open middle. */
export function GearIcon({ size = 22, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {TEETH.map((deg) => (
        <G key={deg} rotation={deg} origin="12, 12">
          <Rect x={10.45} y={1.1} width={3.1} height={5.9} rx={1.3} fill={color} />
        </G>
      ))}
      <Circle cx={12} cy={12} r={5.6} stroke={color} strokeWidth={2.7} fill="none" />
    </Svg>
  );
}
