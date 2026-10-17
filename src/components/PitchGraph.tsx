import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { colors } from '../theme';

/** Draws the model's pitch and the learner's pitch, each centred on its own voice, time-stretched to fit. */
export default function PitchGraph({
  user,
  model,
  userCuts,
  width = 300,
  height = 110,
}: {
  user: number[];
  model: number[];
  userCuts: number[];
  width?: number;
  height?: number;
}) {
  const path = (p: number[]) => {
    const vals = p.filter((v) => !Number.isNaN(v)).sort((a, b) => a - b);
    if (!vals.length) return '';
    const med = vals[Math.floor(vals.length / 2)];
    const y = (v: number) => height / 2 - Math.max(-8, Math.min(8, v - med)) * (height / 18);
    const x = (i: number) => (i / Math.max(1, p.length - 1)) * width;
    let d = '';
    let pen = false;
    p.forEach((v, i) => {
      if (Number.isNaN(v)) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };
  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={colors.line} strokeWidth={1} />
        {userCuts.slice(1, -1).map((c, i) => {
          const x = (c / Math.max(1, user.length - 1)) * width;
          return <Line key={i} x1={x} y1={4} x2={x} y2={height - 4} stroke={colors.line} strokeWidth={1} strokeDasharray="3 4" />;
        })}
        <Path d={path(model)} stroke="#9C8F84" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
        <Path d={path(user)} stroke={colors.red} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <View style={styles.legend}>
        <View style={[styles.swatch, { backgroundColor: '#9C8F84' }]} />
        <Text style={styles.legendText}>Model</Text>
        <View style={[styles.swatch, { backgroundColor: colors.red, marginLeft: 14 }]} />
        <Text style={styles.legendText}>You</Text>
        <Text style={[styles.legendText, { marginLeft: 'auto' }]}>pitch over time</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  swatch: { width: 14, height: 4, borderRadius: 2, marginRight: 6 },
  legendText: { fontSize: 12, color: colors.muted },
});
