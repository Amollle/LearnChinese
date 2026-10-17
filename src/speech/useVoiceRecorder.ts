import {
  AudioQuality,
  IOSOutputFormat,
  RecordingOptions,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { decodePcm, resampleTo16k } from './analysis';

// Uncompressed 16 kHz mono recording, so the app can analyse the voice itself.
const RECORDING: RecordingOptions = {
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  ios: {
    extension: '.wav',
    sampleRate: 16000,
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.MAX,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: { extension: '.m4a', sampleRate: 16000, outputFormat: 'mpeg4', audioEncoder: 'aac' },
  web: {},
};

export type RecorderState = 'idle' | 'recording' | 'processing';

/**
 * Tap-to-record helper. `start()` begins recording (auto-stops after maxSeconds);
 * `stop()` ends it and calls onAudio with 16 kHz samples.
 */
export function useVoiceRecorder(onAudio: (samples: Float32Array, uri: string) => void, maxSeconds = 5) {
  const recorder = useAudioRecorder(RECORDING);
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cb = useRef(onAudio);
  cb.current = onAudio;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const stop = async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    try {
      await recorder.stop();
    } catch {
      // already stopped
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
    const uri = recorder.uri;
    if (!uri) {
      setState('idle');
      return;
    }
    setState('processing');
    setTimeout(async () => {
      try {
        const bytes = new Uint8Array(await new File(uri).arrayBuffer());
        const { samples, sampleRate } = decodePcm(bytes);
        cb.current(resampleTo16k(samples, sampleRate), uri);
      } catch {
        setError('Something went wrong reading the recording. Please try again.');
      }
      setState('idle');
    }, 60);
  };

  const start = async () => {
    setError(null);
    if (Platform.OS !== 'ios') {
      setError('Speaking works on iPhone for now.');
      return;
    }
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError('Please allow microphone access for Expo Go in your iPhone Settings, then try again.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setState('recording');
    timer.current = setTimeout(() => stop(), maxSeconds * 1000);
  };

  return { state, error, setError, start, stop, toggle: () => (state === 'recording' ? stop() : state === 'idle' ? start() : undefined) };
}
