import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

/**
 * Hand-drawn icons, so the app does not depend on how a particular phone
 * happens to render an emoji. They are drawn the same way as the panda and
 * the shop items: flat colour inside a dark ink outline.
 */

/** The cog outline: eight teeth, generated once and kept as a path. */
const GEAR =
  'M10.03 1.89 A10.3 10.3 0 0 1 13.97 1.89 L14.01 4.98 A7.3 7.3 0 0 1 15.54 5.62 L17.76 3.46 ' +
  'A10.3 10.3 0 0 1 20.54 6.24 L18.38 8.46 A7.3 7.3 0 0 1 19.02 9.99 L22.11 10.03 ' +
  'A10.3 10.3 0 0 1 22.11 13.97 L19.02 14.01 A7.3 7.3 0 0 1 18.38 15.54 L20.54 17.76 ' +
  'A10.3 10.3 0 0 1 17.76 20.54 L15.54 18.38 A7.3 7.3 0 0 1 14.01 19.02 L13.97 22.11 ' +
  'A10.3 10.3 0 0 1 10.03 22.11 L9.99 19.02 A7.3 7.3 0 0 1 8.46 18.38 L6.24 20.54 ' +
  'A10.3 10.3 0 0 1 3.46 17.76 L5.62 15.54 A7.3 7.3 0 0 1 4.98 14.01 L1.89 13.97 ' +
  'A10.3 10.3 0 0 1 1.89 10.03 L4.98 9.99 A7.3 7.3 0 0 1 5.62 8.46 L3.46 6.24 ' +
  'A10.3 10.3 0 0 1 6.24 3.46 L8.46 5.62 A7.3 7.3 0 0 1 9.99 4.98 L10.03 1.89 Z';

/** A cog wheel in the app's red and gold, outlined in ink like the panda. */
export function GearIcon({
  size = 24,
  body = colors.red,
  hub = colors.gold,
  ink = colors.ink,
}: {
  size?: number;
  body?: string;
  hub?: string;
  ink?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={GEAR} fill={body} stroke={ink} strokeWidth={1.6} strokeLinejoin="round" />
      <Circle cx={12} cy={12} r={4.1} fill={hub} stroke={ink} strokeWidth={1.6} />
    </Svg>
  );
}
