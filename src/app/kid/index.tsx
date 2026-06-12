import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useStore, COLORS } from '@/store';

export default function KidPickerScreen() {
  const { state, setCurrentKid, setRole } = useStore();

  const [pinKidId, setPinKidId] = useState<string | null>(null);
  const [pin, setPin] = useState('');

  function selectKid(id: string) {
    setPinKidId(id);
    setPin('');
  }

  function pressDigit(d: string) {
    if (pin.length < 4) setPin(p => p + d);
  }

  function backspace() {
    setPin(p => p.slice(0, -1));
  }

  function submitPin() {
    const kid = state.kids.find(k => k.id === pinKidId);
    if (!kid) return;
    if (pin !== kid.pin) {
      Alert.alert('Wrong PIN', 'Try again.');
      setPin('');
      return;
    }
    setCurrentKid(kid.id);
    setPinKidId(null);
    router.replace('/kid/home');
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <TouchableOpacity style={s.backBtn} onPress={() => { setRole(null); router.replace('/'); }}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <Text style={s.title}>Who are you?</Text>

        {state.kids.length === 0 ? (
          <Text style={s.empty}>No kids have been set up yet.{'\n'}Ask a parent to add your profile.</Text>
        ) : (
          <View style={s.grid}>
            {state.kids.map(kid => (
              <TouchableOpacity
                key={kid.id}
                style={s.kidCard}
                onPress={() => selectKid(kid.id)}
                activeOpacity={0.8}
              >
                <View style={[s.avatar, { backgroundColor: kid.avatarColor }]}>
                  <Text style={s.avatarText}>{kid.name[0].toUpperCase()}</Text>
                </View>
                <Text style={s.kidName}>{kid.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* PIN modal */}
      <Modal visible={pinKidId !== null} animationType="slide" presentationStyle="pageSheet" transparent>
        <View style={s.overlay}>
          <View style={s.pinSheet}>
            <Text style={s.pinTitle}>
              {state.kids.find(k => k.id === pinKidId)?.name}'s PIN
            </Text>
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
                  onPress={() => {
                    if (k === '⌫') backspace();
                    else if (k !== '') pressDigit(k);
                  }}
                  disabled={k === ''}
                  activeOpacity={0.7}
                >
                  <Text style={s.keyText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.pinActions}>
              <TouchableOpacity onPress={() => setPinKidId(null)}>
                <Text style={s.pinCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.pinGo, pin.length < 4 && s.pinGoDisabled]}
                onPress={submitPin}
                disabled={pin.length < 4}
              >
                <Text style={s.pinGoText}>Go →</Text>
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
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  backBtn: { marginBottom: 8 },
  backBtnText: { color: COLORS.textSecondary, fontSize: 15 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 32, textAlign: 'center' },
  empty: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 15, marginTop: 40, lineHeight: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  kidCard: { alignItems: 'center', gap: 10, width: 120 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  avatarText: { fontSize: 34, fontWeight: '700', color: '#fff' },
  kidName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  // PIN
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pinSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, paddingBottom: 48, alignItems: 'center', gap: 24 },
  pinTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  dots: { flexDirection: 'row', gap: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORS.border, backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 240, gap: 12 },
  key: { width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  keyEmpty: { backgroundColor: 'transparent' },
  keyText: { fontSize: 22, fontWeight: '600', color: COLORS.textPrimary },
  pinActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  pinCancel: { fontSize: 16, color: COLORS.textSecondary, padding: 8 },
  pinGo: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  pinGoDisabled: { opacity: 0.4 },
  pinGoText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
