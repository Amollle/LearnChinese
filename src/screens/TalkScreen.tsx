import React, { useEffect, useState } from 'react';
import PetBuddy, { petReact } from '../pet/PetBuddy';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/ui';
import { scenarios } from '../data/conversations';
import { aiConfigured } from '../services/ai';
import { colors } from '../theme';
import ConversationScreen from './ConversationScreen';
import FreeTalkScreen from './FreeTalkScreen';

/** "Talk" tab: pick a real-life situation and have a mock conversation. */
export default function TalkScreen({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [freeOpen, setFreeOpen] = useState(false);
  const open = scenarios.find((s) => s.id === openId);

  // the list is showing whenever this screen first appears
  useEffect(() => {
    onOpenChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setOpen = (id: string | null) => {
    setOpenId(id);
    onOpenChange?.(id !== null);
  };

  const setFree = (on: boolean) => {
    setFreeOpen(on);
    onOpenChange?.(on);
  };

  if (freeOpen) return <FreeTalkScreen onClose={() => setFree(false)} />;
  if (open) return <ConversationScreen scenario={open} onClose={() => setOpen(null)} />;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Talk</Text>
        <PetBuddy size={56} />
      </View>
      <Text style={styles.subtitle}>
        Practice real conversations. Tap a reply or say it out loud — and if you're stuck, tap “I don't understand” for
        help.
      </Text>
      <Pressable onPress={() => aiConfigured && setFree(true)} disabled={!aiConfigured}>
        {({ pressed }) => (
          <Card style={[styles.card, styles.freeCard, pressed && { opacity: 0.85 }]}>
            <View style={[styles.emojiWrap, styles.freeEmojiWrap]}>
              <Text style={styles.emoji}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                Free talk <Text style={styles.zh}>自由对话</Text>
              </Text>
              <Text style={styles.desc}>
                {aiConfigured
                  ? 'No script. Say anything you like and your partner answers for real — then a coach tells you how you did.'
                  : 'Not connected yet. Needs internet and a short one-time setup.'}
              </Text>
              {aiConfigured && <Text style={styles.partner}>Needs internet</Text>}
            </View>
          </Card>
        )}
      </Pressable>

      <Text style={styles.sectionLabel}>OR PRACTICE A SET SITUATION</Text>

      {scenarios.map((s) => (
        <Pressable key={s.id} onPress={() => setOpen(s.id)}>
          {({ pressed }) => (
            <Card style={[styles.card, pressed && { opacity: 0.85 }]}>
              <View style={styles.emojiWrap}>
                <Text style={styles.emoji}>{s.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {s.title} <Text style={styles.zh}>{s.zhTitle}</Text>
                </Text>
                <Text style={styles.desc}>{s.description}</Text>
                <Text style={styles.partner}>
                  You talk to: {s.partner} ({s.partnerEn})
                </Text>
              </View>
            </Card>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 30, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 4, marginBottom: 8, lineHeight: 21 },
  card: { flexDirection: 'row', gap: 14, marginTop: 12, alignItems: 'center' },
  emojiWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 30 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  zh: { color: colors.red, fontWeight: '700' },
  desc: { fontSize: 13, color: colors.muted, marginTop: 3, lineHeight: 18 },
  partner: { fontSize: 12, color: colors.jade, fontWeight: '700', marginTop: 5 },
  freeCard: { borderWidth: 2, borderColor: colors.gold },
  freeEmojiWrap: { backgroundColor: colors.jadeSoft },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginTop: 22 },
});
