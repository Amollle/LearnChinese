import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ImageStyle, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { AncientGlyph } from './AncientGlyph';
import { photoFiles } from '../data/photoFiles';
import { photoUrl } from '../data/pictographs';
import { playChinese } from '../services/audio';
import { colors, radius, shadow } from '../theme';

export const speakChinese = playChinese;

type PhotoListener = (error: string) => void;
const photoErrorListeners = new Set<PhotoListener>();

/** Lets a screen find out when photos fail to load (to show a helpful notice). */
export function onPhotoError(listener: PhotoListener) {
  photoErrorListeners.add(listener);
  return () => {
    photoErrorListeners.delete(listener);
  };
}

/**
 * The picture for a character, in the style the learner picked on the Pictures page:
 * the ancient oracle-bone form (default), a stock photo, or an emoji.
 */
export function Photo({
  id,
  width = 400,
  label,
  hanzi,
  emoji,
  emojiSize = 40,
  style,
}: {
  id: string;
  width?: number;
  label: string;
  hanzi?: string;
  emoji?: string;
  emojiSize?: number;
  style: StyleProp<ImageStyle>;
}) {
  const { pictureStyle } = useSettings();
  const [failed, setFailed] = useState(false);
  if (pictureStyle === 'ancient' && hanzi) {
    return <AncientGlyph hanzi={hanzi} style={style as StyleProp<ViewStyle>} />;
  }
  if (pictureStyle === 'emoji' && emoji) {
    return (
      <View style={[style as StyleProp<ViewStyle>, styles.photoFallback]}>
        <Text style={{ fontSize: emojiSize }}>{emoji}</Text>
      </View>
    );
  }
  // Prefer the copy bundled inside the app; otherwise load it from the internet.
  const bundled = photoFiles[id];
  const source = bundled !== undefined ? bundled : { uri: photoUrl(id, width) };
  if (failed) {
    return (
      <View style={[style as StyleProp<ViewStyle>, styles.photoFallback]}>
        <Text style={styles.photoFallbackText}>{label}</Text>
      </View>
    );
  }
  return (
    <Image
      source={source}
      style={[styles.photo, style]}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
      onError={(e) => {
        setFailed(true);
        photoErrorListeners.forEach((l) => l(e.error));
      }}
    />
  );
}

export function SpeakButton({ text, size = 44 }: { text: string; size?: number }) {
  return (
    <Pressable
      accessibilityLabel="Play pronunciation"
      onPress={() => speakChinese(text)}
      hitSlop={8}
      style={({ pressed }) => [
        styles.speak,
        { width: size, height: size, borderRadius: size / 2, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={{ fontSize: size * 0.45 }}>🔊</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, color = colors.red, height = 8 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${pct}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  style,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const bg = variant === 'primary' ? colors.red : variant === 'success' ? colors.jade : colors.card;
  const fg = variant === 'secondary' ? colors.ink : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        variant === 'secondary' && { borderWidth: 1.5, borderColor: colors.line },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  photo: { backgroundColor: colors.line },
  photoFallback: { backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  photoFallbackText: { fontSize: 40, color: colors.gold, fontWeight: '600' },
  speak: {
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    backgroundColor: colors.line,
    overflow: 'hidden',
    width: '100%',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    ...shadow,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
  },
});
