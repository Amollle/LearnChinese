import React from 'react';
import { Text } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

/**
 * Cartoon pictures for the lesson stops on the path, drawn the same way as the
 * panda and the shop items: flat colour inside a dark ink outline.
 *
 * Each picture is just a list of simple shapes. They get drawn twice — first as
 * a fat ink-coloured underlay, which welds the shapes into one silhouette with
 * a single outline, then again as flat colour on top. Small details (dots,
 * clock hands, steam) go last, over everything.
 */

const INK = '#2B2118';
const CREAM = '#FFF7E8';
const SKIN = '#F2B079';
const BLUE = '#4C7FD6';
const PINK = '#E07BA8';

type Shape =
  | { k: 'c'; cx: number; cy: number; r: number }
  | { k: 'e'; cx: number; cy: number; rx: number; ry: number }
  | { k: 'r'; x: number; y: number; w: number; h: number; rx?: number; rot?: number }
  | { k: 'p'; d: string };

/** A shape that is part of the silhouette. `line` outlines it again on top. */
type Part = { s: Shape; fill: string; line?: boolean };
/** A mark drawn over the silhouette: filled, stroked, or both. */
type Detail = { s: Shape; fill?: string; stroke?: string; width?: number };
type Picture = { parts: Part[]; details?: Detail[]; rot?: number };

/** A body: a column with a domed top, like the shop items' little figures. */
function dome(x: number, top: number, w: number, bottom: number) {
  const r = w / 2;
  return `M${x} ${bottom} L${x} ${top + r} A${r} ${r} 0 0 1 ${x + w} ${top + r} L${x + w} ${bottom} Z`;
}

function draw(s: Shape, props: Record<string, unknown>, key: string) {
  switch (s.k) {
    case 'c':
      return <Circle key={key} cx={s.cx} cy={s.cy} r={s.r} {...props} />;
    case 'e':
      return <Ellipse key={key} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...props} />;
    case 'p':
      return <Path key={key} d={s.d} {...props} />;
    case 'r': {
      const rect = <Rect key={key} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx ?? 0} {...props} />;
      if (!s.rot) return rect;
      return (
        <G key={key} rotation={s.rot} originX={s.x + s.w / 2} originY={s.y + s.h / 2}>
          {rect}
        </G>
      );
    }
  }
}

const pictures: Record<string, Picture> = {
  // a hand waving hello
  greetings: {
    parts: [
      { s: { k: 'r', x: 6.5, y: 23, w: 5.2, h: 13, rx: 2.6, rot: -35 }, fill: SKIN },
      { s: { k: 'r', x: 13.5, y: 21, w: 22, h: 19, rx: 9.5 }, fill: SKIN },
      { s: { k: 'r', x: 14.6, y: 14.5, w: 4.8, h: 12, rx: 2.4 }, fill: SKIN },
      { s: { k: 'r', x: 19.8, y: 10.5, w: 4.8, h: 16, rx: 2.4 }, fill: SKIN },
      { s: { k: 'r', x: 25, y: 9.8, w: 4.8, h: 17, rx: 2.4 }, fill: SKIN },
      { s: { k: 'r', x: 30.2, y: 13.5, w: 4.8, h: 13, rx: 2.4 }, fill: SKIN },
    ],
    details: [
      { s: { k: 'p', d: 'M38.5 15 Q42.5 20 42 26' }, stroke: colors.gold, width: 3 },
      { s: { k: 'p', d: 'M41.5 10.5 Q46.5 18 45.5 27' }, stroke: colors.gold, width: 3 },
    ],
  },

  // counting blocks: one, two, three
  numbers: {
    parts: [
      { s: { k: 'r', x: 16.5, y: 5, w: 15, h: 15, rx: 4.5 }, fill: colors.jade },
      { s: { k: 'r', x: 5.5, y: 26, w: 15, h: 15, rx: 4.5 }, fill: colors.red },
      { s: { k: 'r', x: 26.5, y: 26, w: 15, h: 15, rx: 4.5 }, fill: colors.gold },
    ],
    details: [
      { s: { k: 'c', cx: 24, cy: 12.5, r: 2.3 }, fill: CREAM },
      { s: { k: 'c', cx: 10.5, cy: 31, r: 2.3 }, fill: CREAM },
      { s: { k: 'c', cx: 15.5, cy: 36, r: 2.3 }, fill: CREAM },
      { s: { k: 'c', cx: 30.5, cy: 30.5, r: 2.2 }, fill: INK },
      { s: { k: 'c', cx: 34, cy: 34, r: 2.2 }, fill: INK },
      { s: { k: 'c', cx: 37.5, cy: 37.5, r: 2.2 }, fill: INK },
    ],
  },

  // two speech bubbles, talking
  basics: {
    parts: [
      { s: { k: 'r', x: 4, y: 8, w: 25, h: 19, rx: 7 }, fill: colors.red },
      { s: { k: 'p', d: 'M11 25 L9 37.5 L19.5 27 Z' }, fill: colors.red },
      { s: { k: 'r', x: 30, y: 26, w: 14, h: 11.5, rx: 5 }, fill: colors.gold },
      { s: { k: 'p', d: 'M40 36 L42.5 43 L35 37 Z' }, fill: colors.gold },
    ],
    details: [
      { s: { k: 'c', cx: 10.5, cy: 17.5, r: 2.2 }, fill: CREAM },
      { s: { k: 'c', cx: 16.5, cy: 17.5, r: 2.2 }, fill: CREAM },
      { s: { k: 'c', cx: 22.5, cy: 17.5, r: 2.2 }, fill: CREAM },
    ],
  },

  // two grown-ups and a child
  family: {
    parts: [
      { s: { k: 'c', cx: 13.5, cy: 13, r: 6.6 }, fill: SKIN },
      { s: { k: 'p', d: dome(5, 18.5, 17, 41) }, fill: colors.red },
      { s: { k: 'c', cx: 34, cy: 14.5, r: 6.2 }, fill: SKIN },
      { s: { k: 'p', d: dome(26, 20, 16, 41) }, fill: colors.jade },
      { s: { k: 'c', cx: 24, cy: 26, r: 5.4 }, fill: SKIN, line: true },
      { s: { k: 'p', d: dome(17.5, 30.5, 13, 41) }, fill: colors.gold, line: true },
    ],
  },

  // a bowl of rice, steaming
  food: {
    parts: [
      { s: { k: 'e', cx: 24, cy: 21, rx: 15.5, ry: 6.5 }, fill: CREAM },
      { s: { k: 'p', d: 'M6 22 L42 22 Q42 42 24 42 Q6 42 6 22 Z' }, fill: colors.red, line: true },
    ],
    details: [
      { s: { k: 'c', cx: 24, cy: 18.5, r: 3.2 }, fill: colors.jade, stroke: INK, width: 2 },
      { s: { k: 'p', d: 'M16.5 13 Q20.5 9 16.5 4.5' }, stroke: colors.muted, width: 2.4 },
      { s: { k: 'p', d: 'M27.5 14 Q31.5 10 27.5 5.5' }, stroke: colors.muted, width: 2.4 },
    ],
  },

  // a paint palette
  colors: {
    parts: [{ s: { k: 'e', cx: 24, cy: 24, rx: 18, ry: 15.5 }, fill: '#F6E3C8' }],
    details: [
      { s: { k: 'c', cx: 24, cy: 33, r: 4.2 }, fill: colors.bg, stroke: INK, width: 2.2 },
      { s: { k: 'c', cx: 14, cy: 16.5, r: 4 }, fill: colors.red, stroke: INK, width: 2 },
      { s: { k: 'c', cx: 24, cy: 13.5, r: 4 }, fill: colors.gold, stroke: INK, width: 2 },
      { s: { k: 'c', cx: 34, cy: 16.5, r: 4 }, fill: colors.jade, stroke: INK, width: 2 },
      { s: { k: 'c', cx: 12.5, cy: 27, r: 4 }, fill: BLUE, stroke: INK, width: 2 },
      { s: { k: 'c', cx: 35.5, cy: 27, r: 4 }, fill: PINK, stroke: INK, width: 2 },
    ],
  },

  // an alarm clock
  time: {
    parts: [
      { s: { k: 'c', cx: 11, cy: 11, r: 5.5 }, fill: colors.red },
      { s: { k: 'c', cx: 37, cy: 11, r: 5.5 }, fill: colors.red },
      { s: { k: 'r', x: 8, y: 35, w: 5.5, h: 8.5, rx: 2.7, rot: 25 }, fill: colors.red },
      { s: { k: 'r', x: 34.5, y: 35, w: 5.5, h: 8.5, rx: 2.7, rot: -25 }, fill: colors.red },
      { s: { k: 'c', cx: 24, cy: 25, r: 16 }, fill: colors.gold, line: true },
    ],
    details: [
      { s: { k: 'c', cx: 24, cy: 25, r: 12 }, fill: CREAM, stroke: INK, width: 2.2 },
      { s: { k: 'p', d: 'M24 25 L24 16' }, stroke: INK, width: 3 },
      { s: { k: 'p', d: 'M24 25 L31.5 28' }, stroke: INK, width: 3 },
      { s: { k: 'c', cx: 24, cy: 25, r: 1.8 }, fill: INK },
    ],
  },

  // an aeroplane, banking
  travel: {
    rot: -15,
    parts: [
      { s: { k: 'r', x: 20.5, y: 5, w: 7, h: 33, rx: 3.5 }, fill: colors.red },
      { s: { k: 'p', d: 'M24 16 L4 29 L4 33 L24 27 L44 33 L44 29 Z' }, fill: colors.red },
      { s: { k: 'p', d: 'M24 31 L14 38.5 L14 42.5 L24 39.5 L34 42.5 L34 38.5 Z' }, fill: colors.red },
    ],
    details: [{ s: { k: 'c', cx: 24, cy: 14, r: 2.4 }, fill: CREAM, stroke: INK, width: 1.8 }],
  },
};

/** True when a lesson has a drawn picture, rather than falling back to its emoji. */
export function hasLessonIcon(id: string) {
  return !!pictures[id];
}

export function LessonIcon({ id, size = 40, fallback }: { id: string; size?: number; fallback?: string }) {
  const pic = pictures[id];
  if (!pic) return <Text style={{ fontSize: Math.round(size * 0.78) }}>{fallback ?? ''}</Text>;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <G rotation={pic.rot ?? 0} originX={24} originY={24}>
        {pic.parts.map((p, i) =>
          draw(
            p.s,
            { fill: INK, stroke: INK, strokeWidth: 5, strokeLinejoin: 'round', strokeLinecap: 'round' },
            `u${i}`,
          ),
        )}
        {pic.parts.map((p, i) =>
          draw(
            p.s,
            {
              fill: p.fill,
              stroke: p.line ? INK : 'none',
              strokeWidth: p.line ? 2.2 : 0,
              strokeLinejoin: 'round',
            },
            `f${i}`,
          ),
        )}
        {(pic.details ?? []).map((d, i) =>
          draw(
            d.s,
            {
              fill: d.fill ?? 'none',
              stroke: d.stroke ?? 'none',
              strokeWidth: d.width ?? 0,
              strokeLinejoin: 'round',
              strokeLinecap: 'round',
            },
            `d${i}`,
          ),
        )}
      </G>
    </Svg>
  );
}
