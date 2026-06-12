import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore, COLORS, getUrgency, URGENCY_COLORS, todayStr } from '@/store';

export default function KidCompleteScreen() {
  const { choreId, dueDate } = useLocalSearchParams<{ choreId: string; dueDate: string }>();
  const { state, submitCompletion } = useStore();
  const today = todayStr();

  const chore = state.chores.find(c => c.id === choreId);
  const kidId = state.currentKidId;

  if (!chore || !kidId || !dueDate) {
    router.back();
    return null;
  }

  const urgency = getUrgency(dueDate, today);
  const isLate = dueDate < today;

  const existingCompletion = state.completions.find(
    c => c.choreId === choreId && c.kidId === kidId && c.dueDate === dueDate && c.status !== 'rejected'
  );

  if (existingCompletion) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.container}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={s.doneCard}>
            <Text style={s.doneEmoji}>
              {existingCompletion.status === 'submitted' ? '⏳' : '✅'}
            </Text>
            <Text style={s.doneTitle}>
              {existingCompletion.status === 'submitted' ? 'Waiting for approval' : 'Done!'}
            </Text>
            <Text style={s.doneSub}>
              {existingCompletion.status === 'submitted'
                ? 'Your parent needs to approve this before stars are added.'
                : `You earned ⭐ ${existingCompletion.starsAwarded} stars!`}
            </Text>
          </View>
          <TouchableOpacity style={s.goHome} onPress={() => router.replace('/kid/home')}>
            <Text style={s.goHomeText}>Back to chores</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function markDone() {
    submitCompletion(choreId, kidId!, dueDate);
    router.replace('/kid/home');
  }

  const starsEarned = isLate
    ? chore.latePolicy === 'half' ? Math.floor(chore.stars / 2)
    : chore.latePolicy === 'none' ? 0
    : chore.stars
    : chore.stars;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={s.card}>
          <View style={[s.urgencyPill, { backgroundColor: URGENCY_COLORS[urgency] }]}>
            <Text style={s.urgencyText}>
              {urgency === 'overdue' ? 'Overdue' : urgency === 'soon' ? 'Due today' : 'Coming up'}
            </Text>
          </View>

          <Text style={s.choreTitle}>{chore.title}</Text>

          {chore.description ? <Text style={s.choreDesc}>{chore.description}</Text> : null}

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Stars</Text>
            <Text style={s.detailValue}>
              ⭐ {starsEarned}
              {isLate && chore.latePolicy !== 'full' && (
                <Text style={s.lateNote}> (late — {chore.latePolicy === 'none' ? 'no stars' : 'half stars'})</Text>
              )}
            </Text>
          </View>

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Due</Text>
            <Text style={s.detailValue}>{dueDate}</Text>
          </View>

          {chore.requiresApproval && (
            <View style={s.infoBox}>
              <Text style={s.infoText}>⏳ Stars land after a parent approves.</Text>
            </View>
          )}

          {chore.requiresPhoto && (
            <View style={[s.infoBox, { backgroundColor: COLORS.primaryDim }]}>
              <Text style={s.infoText}>📷 Camera coming soon — photo step not required yet.</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={s.doneBtn} onPress={markDone} activeOpacity={0.85}>
          <Text style={s.doneBtnText}>
            {chore.requiresApproval ? 'Submit for approval' : 'Mark as done ✓'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, paddingHorizontal: 20 },
  back: { paddingVertical: 12 },
  backText: { color: COLORS.textSecondary, fontSize: 15 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, gap: 14 },
  urgencyPill: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  urgencyText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  choreTitle: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  choreDesc: { fontSize: 15, color: COLORS.textSecondary },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 15, color: COLORS.textSecondary },
  detailValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  lateNote: { fontWeight: '400', color: COLORS.danger, fontSize: 13 },
  infoBox: { backgroundColor: COLORS.starDim, borderRadius: 10, padding: 12 },
  infoText: { fontSize: 14, color: COLORS.textPrimary },
  doneBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  doneBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  // Already done
  doneCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 32, alignItems: 'center', gap: 12, marginTop: 24 },
  doneEmoji: { fontSize: 56 },
  doneTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  doneSub: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
  goHome: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  goHomeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
