import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { supabaseConfigured } from '../lib/supabase';
import { colors, radius } from '../theme';

/**
 * Settings: account details and the three "start over" actions that used to
 * sit at the bottom of Home. Each one asks first, because all three throw
 * something away.
 */
export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { user, logOut, retakePlacement } = useAuth();
  const { progress, resetAll } = useProgress();

  const confirmRetake = () =>
    Alert.alert(
      'Retake the placement quiz?',
      'You’ll answer the quiz again to set your level. Your XP, streak and learned words all stay as they are.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retake quiz', onPress: retakePlacement },
      ],
    );

  const confirmReset = () =>
    Alert.alert(
      'Reset all progress?',
      `This clears your ${progress.xp} XP, your ${progress.streak}-day streak and all ${progress.learned.length} words you’ve learned. Your panda and your daily goal are kept. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset everything', style: 'destructive', onPress: resetAll },
      ],
    );

  const confirmLogOut = () =>
    Alert.alert('Log out?', 'Your progress is saved — log back in any time to pick up where you left off.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logOut },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.back}>‹ Home</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>YOUR ACCOUNT</Text>
        <Card style={styles.card}>
          <Row label="Name" value={user?.name || '—'} />
          <Row label="Email" value={user?.email || '—'} />
          <Row label="Level" value={user?.level || 'not set yet'} />
          <Row label="Progress saved" value={supabaseConfigured ? 'in the cloud ☁️' : 'on this phone'} last />
        </Card>

        <Text style={styles.sectionLabel}>START OVER</Text>
        <Card style={styles.card}>
          <Action
            title="Retake placement quiz"
            detail="Answer the quiz again to change your level. Keeps everything else."
            onPress={confirmRetake}
          />
          <Action
            title="Reset progress"
            detail="Clears your XP, streak and learned words. Keeps your panda."
            onPress={confirmReset}
            danger
          />
          <Action title="Log out" detail="Sign out of this account." onPress={confirmLogOut} danger last />
        </Card>

        <Text style={styles.note}>Each of these asks you to confirm before anything happens.</Text>

        <Text style={styles.version}>
          App version 33 · Home redesign · {supabaseConfigured ? 'synced to cloud ☁️' : 'saved on this phone'}
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Action({
  title,
  detail,
  onPress,
  danger,
  last,
}: {
  title: string;
  detail: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, last && { borderBottomWidth: 0 }, pressed && styles.actionPressed]}
    >
      <Text style={[styles.actionTitle, danger && { color: colors.wrong }]}>{title}</Text>
      <Text style={styles.actionDetail}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  back: { fontSize: 17, color: colors.red, fontWeight: '700', width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  container: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginTop: 10, marginBottom: 8 },
  card: { paddingVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowLabel: { fontSize: 15, color: colors.muted },
  rowValue: { fontSize: 15, color: colors.ink, fontWeight: '700', flexShrink: 1 },
  action: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.line, borderRadius: radius.sm },
  actionPressed: { backgroundColor: colors.redSoft },
  actionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  actionDetail: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  note: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 18, lineHeight: 19 },
  version: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 24 },
});
