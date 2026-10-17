import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { audioFiles } from '../data/audioFiles';
import { convoAudio } from '../data/convoAudio';
import { petAudio } from '../data/petAudio';

/**
 * Plays Chinese pronunciation.
 * 1. Uses real native-speaker recordings bundled with the app (works offline,
 *    and plays even when the iPhone silent switch is on).
 * 2. Falls back to the phone's text-to-speech voice for anything not recorded.
 */
let player: AudioPlayer | null = null;
let lastSource: number | null = null;
let modeReady: Promise<void> | null = null;

function ensureAudioMode() {
  if (!modeReady) {
    modeReady = setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
  }
  return modeReady;
}

async function playSource(source: number) {
  await ensureAudioMode();
  try {
    Speech.stop();
  } catch {
    // ignore
  }
  if (!player) {
    player = createAudioPlayer(source);
    lastSource = source;
    player.play();
    return;
  }
  if (lastSource === source) {
    await player.seekTo(0);
  } else {
    player.replace(source);
    lastSource = source;
  }
  player.play();
}

async function speakWithVoice(text: string, slow = false) {
  await ensureAudioMode();
  try {
    if (await Speech.isSpeakingAsync()) await Speech.stop();
  } catch {
    // ignore
  }
  Speech.speak(text, { language: 'zh-CN', rate: slow ? 0.55 : 0.8 });
}

const clean = (s: string) => s.replace(/[？?…。，!！\s]/g, '');

/** Say a Chinese word or phrase out loud. `slow` uses the slowed-down recording when there is one. */
export function playChinese(text: string, slow = false) {
  const source =
    (slow ? convoAudio[`slow:${text}`] : undefined) ??
    audioFiles[text] ??
    convoAudio[text] ??
    petAudio[text] ??
    audioFiles[clean(text)];
  if (source !== undefined) {
    playSource(source).catch(() => speakWithVoice(clean(text)));
  } else {
    speakWithVoice(clean(text), slow);
  }
}
