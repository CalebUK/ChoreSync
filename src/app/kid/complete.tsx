import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
    const isPending = existingCompletion.status === 'submitted';
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.container}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
          <View style={s.doneCard}>
            <Ionicons
              name={isPending ? 'time-outline' : 'checkmark-circle'}
              size={56}
              color={isPending ? COLORS.star : COLORS.success}
            />
            <Text style={s.doneTitle}>
              {isPending ? 'Waiting for approval' : 'Done!'}
            </Text>
            <Text style={s.doneSub}>
              {isPending
                ? 'Your parent needs to approve this before stars are added.'
                : `You earned ${existingCompletion.starsAwarded} stars!`}
            </Text>
            {!isPending && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="star" size={16} color={COLORS.star} />
                <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.star }}>{existingCompletion.starsAwarded}</Text>
              </View>
            )}
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
          <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
          <Text style={s.backText}>Back</Text>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="star" size={15} color={COLORS.star} />
              <Text style={s.detailValue}>
                {starsEarned}
                {isLate && chore.latePolicy !== 'full' && (
                  <Text style={s.lateNote}> (late — {chore.latePolicy === 'none' ? 'no stars' : 'half stars'})</Text>
                )}
              </Text>
            </View>
          </View>

          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Due</Text>
            <Text style={s.detailValue}>{dueDate}</Text>
          </View>

          {chore.requiresApproval && (
            <View style={s.infoBox}>
              <Ionicons name="time-outline" size={15} color={COLORS.star} style={{ marginRight: 6 }} />
              <Text style={s.infoText}>Stars land after a parent approves.</Text>
            </View>
          )}

          {chore.requiresPhoto && (
            <View style={[s.infoBox, { backgroundColor: COLORS.primaryDim }]}>
              <Ionicons name="camera-outline" size={15} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={[s.infoText, { color: COLORS.primary }]}>Camera coming soon — photo step not required yet.</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={s.doneBtn} onPress={markDone} activeOpacity={0.85}>
          <Text style={s.doneBtnText}>
            {chore.requiresApproval ? 'Submit for approval' : 'Mark as done'}
          </Text>
          {!chore.requiresApproval && <Ionicons name="checkmark" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, paddingHorizontal: 20 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
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
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.starDim, borderRadius: 10, padding: 12 },
  infoText: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 18, marginTop: 24 },
  doneBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  // Already done
  doneCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 32, alignItems: 'center', gap: 12, marginTop: 24 },
  doneTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  doneSub: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
  goHome: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  goHomeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
