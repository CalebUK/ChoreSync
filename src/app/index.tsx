import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useStore, COLORS } from '@/store';
import type { Kid } from '@/types';

const PARENT_PIN = '0000'; // demo only — replaced by Firebase Auth in wiring step 1
const KEY_SESSION = '@choreSync/session';
const KEY_BIO = '@choreSync/bioSession';

type SessionData = { role: 'parent' | 'kid'; kidId: string | null };
type PinTarget = { kind: 'kid'; kid: Kid } | { kind: 'parent' };

export default function HubScreen() {
  const { state, setRole, setCurrentKid } = useStore();

  const [ready, setReady] = useState(false); // hidden while restoring session
  const [target, setTarget] = useState<PinTarget | null>(null);
  const [pin, setPin] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const submitting = useRef(false);

  // ── Session restore on mount ───────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const hw = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const enrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
      setBioAvailable(!!(hw && enrolled));

      // Try biometric-linked session first
      const bioJson = await AsyncStorage.getItem(KEY_BIO).catch(() => null);
      if (bioJson) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Log in to ChoreSync',
          fallbackLabel: 'Use PIN instead',
        }).catch(() => ({ success: false as const }));
        if (result.success) {
          navigateSession(JSON.parse(bioJson));
          return;
        }
      }

      // Fall back to plain "stay logged in" session
      const sessionJson = await AsyncStorage.getItem(KEY_SESSION).catch(() => null);
      if (sessionJson) {
        navigateSession(JSON.parse(sessionJson));
        return;
      }

      setReady(true);
    })();
  }, []);

  function navigateSession(data: SessionData) {
    if (data.role === 'parent') {
      setRole('parent');
      router.replace('/parent');
    } else if (data.role === 'kid' && data.kidId) {
      setCurrentKid(data.kidId);
      setRole('kid');
      router.replace('/kid/home');
    } else {
      setReady(true);
    }
  }

  // ── PIN helpers ────────────────────────────────────────────────────────────

  function openPin(t: PinTarget) { setTarget(t); setPin(''); submitting.current = false; }
  function closePin() { setTarget(null); setPin(''); submitting.current = false; }

  function pressDigit(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    // Auto-submit on 4th digit — small delay lets the dot render
    if (next.length === 4) setTimeout(() => doSubmit(next), 180);
  }

  function backspace() { setPin(p => p.slice(0, -1)); }

  async function doSubmit(currentPin: string) {
    if (submitting.current || !target) return;
    submitting.current = true;

    const correct =
      target.kind === 'parent'
        ? currentPin === PARENT_PIN
        : currentPin === target.kid.pin;

    if (!correct) {
      setPin('');
      submitting.current = false;
      Alert.alert('Wrong PIN', 'Try again.');
      return;
    }

    const session: SessionData = {
      role: target.kind === 'parent' ? 'parent' : 'kid',
      kidId: target.kind === 'kid' ? target.kid.id : null,
    };

    if (rememberMe) {
      await AsyncStorage.setItem(KEY_SESSION, JSON.stringify(session)).catch(() => {});

      if (bioAvailable) {
        // Offer to link biometrics — do this before navigating
        await new Promise<void>(resolve =>
          Alert.alert(
            'Quick login',
            'Use Face ID / Touch ID next time?',
            [
              { text: 'Not now', style: 'cancel', onPress: () => resolve() },
              {
                text: 'Yes',
                onPress: async () => {
                  await AsyncStorage.setItem(KEY_BIO, JSON.stringify(session)).catch(() => {});
                  resolve();
                },
              },
            ],
          )
        );
      }
    }

    if (session.role === 'parent') {
      setRole('parent');
      closePin();
      router.replace('/parent');
    } else if (session.kidId) {
      setCurrentKid(session.kidId);
      setRole('kid');
      closePin();
      router.replace('/kid/home');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!ready) return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;

  const pinLabel = target
    ? target.kind === 'parent' ? 'Parent PIN' : `${target.kid.name}'s PIN`
    : '';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} bounces={false}>
        <View style={s.header}>
          <Text style={s.star}>⭐</Text>
          <Text style={s.appName}>ChoreSync</Text>
          <Text style={s.subtitle}>Who's here?</Text>
        </View>

        <View style={s.kidList}>
          {state.kids.map(kid => (
            <TouchableOpacity
              key={kid.id}
              style={s.kidRow}
              onPress={() => openPin({ kind: 'kid', kid })}
              activeOpacity={0.7}
            >
              <View style={[s.avatar, { backgroundColor: kid.avatarColor }]}>
                <Text style={s.avatarText}>{kid.name[0].toUpperCase()}</Text>
              </View>
              <Text style={s.kidName}>{kid.name}</Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          ))}

          {state.kids.length === 0 && (
            <Text style={s.noKids}>No kids yet — log in as a parent to add some.</Text>
          )}
        </View>

        <TouchableOpacity style={s.parentBtn} onPress={() => openPin({ kind: 'parent' })} activeOpacity={0.7}>
          <Text style={s.parentBtnText}>Parent →</Text>
        </TouchableOpacity>

        {/* Demo hint — remove once Firebase auth is live */}
        <View style={s.demoHint}>
          <Text style={s.demoHintText}>Demo PINs · Emma 1234 · Liam 5678 · Parent 0000</Text>
        </View>
      </ScrollView>

      {/* PIN sheet */}
      <Modal visible={target !== null} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{pinLabel}</Text>

            <View style={s.dots}>
              {[0, 1, 2, 3].map(i => (
                <View key={i} style={[s.dot, i < pin.length && s.dotFilled]} />
              ))}
            </View>

            <View style={s.keypad}>
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[s.key, k === '' && s.keyEmpty]}
                  onPress={() => { if (k === '⌫') backspace(); else if (k) pressDigit(k); }}
                  disabled={k === ''}
                  activeOpacity={0.55}
                >
                  <Text style={s.keyText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.rememberRow}>
              <View>
                <Text style={s.rememberLabel}>Stay logged in</Text>
                {bioAvailable && rememberMe && (
                  <Text style={s.rememberSub}>You'll be asked about Face ID / Touch ID</Text>
                )}
              </View>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ true: COLORS.primary, false: COLORS.borderLight }}
                thumbColor="#fff"
              />
            </View>

            <View style={s.sheetActions}>
              <TouchableOpacity onPress={closePin} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.goBtn, pin.length < 4 && s.goBtnDim]}
                onPress={() => doSubmit(pin)}
                disabled={pin.length < 4}
              >
                <Text style={s.goText}>Go</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },
  header: { alignItems: 'center', paddingTop: 48, paddingBottom: 40 },
  star: { fontSize: 52, marginBottom: 8 },
  appName: { fontSize: 32, fontWeight: '700', color: COLORS.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 17, color: COLORS.textSecondary, marginTop: 6 },
  kidList: { gap: 10, marginBottom: 32 },
  kidRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 16, padding: 14, gap: 14,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  kidName: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  chevron: { fontSize: 22, color: COLORS.textSecondary },
  noKids: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 15, lineHeight: 22, padding: 16 },
  parentBtn: {
    borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginBottom: 16,
  },
  parentBtnText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  demoHint: { alignItems: 'center', paddingTop: 8 },
  demoHintText: { fontSize: 11, color: COLORS.borderLight, textAlign: 'center' },
  // PIN modal
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 32, paddingBottom: 48, alignItems: 'center', gap: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  dots: { flexDirection: 'row', gap: 18 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: COLORS.borderLight },
  dotFilled: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 240, gap: 12, justifyContent: 'center' },
  key: { width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.cardElevated, alignItems: 'center', justifyContent: 'center' },
  keyEmpty: { backgroundColor: 'transparent' },
  keyText: { fontSize: 24, fontWeight: '500', color: COLORS.textPrimary },
  rememberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 4, gap: 12 },
  rememberLabel: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
  rememberSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sheetActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  cancelBtn: { padding: 10 },
  cancelText: { fontSize: 16, color: COLORS.textSecondary },
  goBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12 },
  goBtnDim: { opacity: 0.35 },
  goText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
