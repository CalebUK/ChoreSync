import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useStore, COLORS } from '@/store';
import type { Kid } from '@/types';

// Parent PIN for the in-memory demo. Replace with Firebase Auth in wiring step 1.
const PARENT_PIN = '0000';

type PinTarget = { kind: 'kid'; kid: Kid } | { kind: 'parent' };

export default function HubScreen() {
  const { state, setRole, setCurrentKid } = useStore();
  const [target, setTarget] = useState<PinTarget | null>(null);
  const [pin, setPin] = useState('');

  function openPin(t: PinTarget) { setTarget(t); setPin(''); }
  function closePin() { setTarget(null); setPin(''); }

  function pressDigit(d: string) { if (pin.length < 4) setPin(p => p + d); }
  function backspace() { setPin(p => p.slice(0, -1)); }

  function submit() {
    if (!target) return;
    if (target.kind === 'parent') {
      if (pin !== PARENT_PIN) { Alert.alert('Wrong PIN', 'Try again.'); setPin(''); return; }
      setRole('parent');
      closePin();
      router.replace('/parent');
    } else {
      if (pin !== target.kid.pin) { Alert.alert('Wrong PIN', 'Try again.'); setPin(''); return; }
      setCurrentKid(target.kid.id);
      setRole('kid');
      closePin();
      router.replace('/kid/home');
    }
  }

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

        <TouchableOpacity
          style={s.parentBtn}
          onPress={() => openPin({ kind: 'parent' })}
          activeOpacity={0.7}
        >
          <Text style={s.parentBtnText}>Parent →</Text>
        </TouchableOpacity>
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
                  onPress={() => k === '⌫' ? backspace() : k && pressDigit(k)}
                  disabled={k === ''}
                  activeOpacity={0.6}
                >
                  <Text style={s.keyText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.sheetActions}>
              <TouchableOpacity onPress={closePin} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.goBtn, pin.length < 4 && s.goBtnDim]}
                onPress={submit}
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
    paddingVertical: 14, alignItems: 'center',
  },
  parentBtnText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  // PIN modal
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 32, paddingBottom: 48, alignItems: 'center', gap: 24,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  dots: { flexDirection: 'row', gap: 18 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: COLORS.borderLight },
  dotFilled: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 240, gap: 12, justifyContent: 'center' },
  key: { width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.cardElevated, alignItems: 'center', justifyContent: 'center' },
  keyEmpty: { backgroundColor: 'transparent' },
  keyText: { fontSize: 24, fontWeight: '500', color: COLORS.textPrimary },
  sheetActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  cancelBtn: { padding: 10 },
  cancelText: { fontSize: 16, color: COLORS.textSecondary },
  goBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12 },
  goBtnDim: { opacity: 0.35 },
  goText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
