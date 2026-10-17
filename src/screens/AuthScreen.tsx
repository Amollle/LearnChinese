import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabaseConfigured } from '../lib/supabase';
import { NeedsVerificationError } from '../services/authService';
import { colors, radius } from '../theme';

type Mode = 'signup' | 'login' | 'verify';

export default function AuthScreen() {
  const { signUp, logIn, verifyEmail, resendCode } = useAuth();
  const [pendingEmail, setPendingEmail] = useState('');
  const [code, setCode] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [resendWait, setResendWait] = useState(0);

  useEffect(() => {
    if (resendWait <= 0) return;
    const t = setTimeout(() => setResendWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [resendWait]);
  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (mode === 'signup' && !name.trim()) return setError('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Please enter a valid email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true);
    try {
      if (mode === 'signup') await signUp(name, email, password);
      else await logIn(email, password);
    } catch (e) {
      if (isNeedsVerification(e)) {
        setPendingEmail(e.email);
        setNotice(e.message);
        setCode('');
        setMode('verify');
        setResendWait(30);
      } else {
        setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      }
      setBusy(false);
    }
  };

  const confirmCode = async () => {
    setError(null);
    if (!/^\d{6,10}$/.test(code.trim())) return setError('Enter the code from the email (numbers only).');
    setBusy(true);
    try {
      await verifyEmail(pendingEmail, code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  const sendNewCode = async () => {
    setError(null);
    try {
      await resendCode(pendingEmail);
      setNotice(`We sent a new code to ${pendingEmail}.`);
      setResendWait(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send a new code.');
    }
  };

  const switchMode = () => {
    setMode(mode === 'signup' ? 'login' : 'signup');
    setError(null);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <Text style={styles.logoText}>学</Text>
        </View>
        <Text style={styles.appName}>LearnChinese</Text>
        <Text style={styles.tagline}>Mandarin for English speakers, one word at a time.</Text>
        {!supabaseConfigured && <Text style={styles.offline}>Offline mode: accounts are saved on this phone only.</Text>}

        {mode === 'verify' ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>📧 Check your email</Text>
            {notice && <Text style={styles.notice}>{notice}</Text>}
            <Text style={styles.help}>Enter the code from the email to finish creating your account. Check your spam folder if you don't see it.</Text>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={10}
              placeholder="123456"
              placeholderTextColor="#D9CFC4"
              autoFocus
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button title={busy ? 'Checking…' : 'Confirm'} onPress={confirmCode} disabled={busy} style={{ marginTop: 8 }} />
            <Pressable onPress={sendNewCode} disabled={resendWait > 0} style={styles.resend} hitSlop={8}>
              <Text style={[styles.switchLink, resendWait > 0 && { color: colors.muted }]}>
                {resendWait > 0 ? `Send a new code (${resendWait}s)` : 'Send a new code'}
              </Text>
            </Pressable>
          </Card>
        ) : (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</Text>

          {mode === 'signup' && (
            <Field label="Your name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="e.g. Alex" />
          )}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="At least 6 characters"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            title={busy ? 'Please wait…' : mode === 'signup' ? 'Sign up' : 'Log in'}
            onPress={submit}
            disabled={busy}
            style={{ marginTop: 8 }}
          />
        </Card>
        )}

        {mode === 'verify' ? (
          <Pressable
            onPress={() => {
              setMode('login');
              setError(null);
            }}
            style={styles.switch}
            hitSlop={8}
          >
            <Text style={styles.switchLink}>‹ Back to log in</Text>
          </Pressable>
        ) : (
          <Pressable onPress={switchMode} style={styles.switch} hitSlop={8}>
            <Text style={styles.switchText}>
              {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
              <Text style={styles.switchLink}>{mode === 'signup' ? 'Log in' : 'Create an account'}</Text>
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// (checked by name: subclassed Errors aren't always reliable with instanceof in React Native)
function isNeedsVerification(e: unknown): e is NeedsVerificationError {
  return e instanceof Error && e.name === 'NeedsVerificationError' && typeof (e as NeedsVerificationError).email === 'string';
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#B3A89E" autoCorrect={false} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: {
    alignSelf: 'center',
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 48, fontWeight: '700' },
  appName: { fontSize: 30, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: 14 },
  tagline: { fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  offline: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: -16, marginBottom: 20 },
  card: { padding: 20 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.bg,
  },
  notice: { fontSize: 15, color: colors.jade, fontWeight: '700', marginBottom: 8 },
  help: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 14 },
  codeInput: {
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: 14,
    fontSize: 32,
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.ink,
    backgroundColor: colors.bg,
    marginBottom: 10,
  },
  resend: { alignSelf: 'center', marginTop: 16 },
  error: { color: colors.wrong, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  switch: { alignSelf: 'center', marginTop: 20 },
  switchText: { fontSize: 15, color: colors.muted },
  switchLink: { color: colors.red, fontWeight: '700' },
});
