import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, COLORS } from '@/store';

export default function RolePickerScreen() {
  const { setRole } = useStore();

  function goParent() {
    setRole('parent');
    router.replace('/parent');
  }

  function goKid() {
    setRole('kid');
    router.replace('/kid');
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.emoji}>⭐</Text>
          <Text style={s.title}>ChoreSync</Text>
          <Text style={s.sub}>Who's using the app?</Text>
        </View>

        <View style={s.buttons}>
          <TouchableOpacity style={[s.card, { borderColor: COLORS.primary }]} onPress={goParent} activeOpacity={0.8}>
            <Text style={s.cardEmoji}>👩‍👦</Text>
            <Text style={s.cardTitle}>Parent</Text>
            <Text style={s.cardSub}>Assign chores, approve completions, manage rewards</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.card, { borderColor: COLORS.star }]} onPress={goKid} activeOpacity={0.8}>
            <Text style={s.cardEmoji}>🌟</Text>
            <Text style={s.cardTitle}>Kid</Text>
            <Text style={s.cardSub}>Complete chores and earn stars for rewards</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  sub: { fontSize: 16, color: COLORS.textSecondary },
  buttons: { gap: 16 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  cardEmoji: { fontSize: 40 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  cardSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});
