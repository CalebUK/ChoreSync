import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, COLORS } from '@/store';
import type { Completion, Redemption } from '@/types';

export default function ParentApprovalsScreen() {
  const { state, approveCompletion, rejectCompletion, approveRedemption, declineRedemption, markRewardGiven } = useStore();

  const pendingCompletions = state.completions.filter(c => c.status === 'submitted');
  const pendingRedemptions = state.redemptions.filter(r => r.status === 'requested');
  const toGive = state.redemptions.filter(r => r.status === 'approved');

  function getKidName(kidId: string) {
    return state.kids.find(k => k.id === kidId)?.name ?? 'Unknown';
  }

  function getChoreName(choreId: string) {
    return state.chores.find(c => c.id === choreId)?.title ?? 'Unknown';
  }

  function getRewardName(rewardId: string) {
    return state.rewards.find(r => r.id === rewardId)?.title ?? 'Unknown';
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString();
  }

  const totalPending = pendingCompletions.length + pendingRedemptions.length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.titleRow}>
        <Text style={s.screenTitle}>Approvals</Text>
        {totalPending > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{totalPending}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={s.content}>
            {/* Completions */}
            <Text style={s.sectionTitle}>Chore completions</Text>
            {pendingCompletions.length === 0 ? (
              <Text style={s.empty}>No pending completions.</Text>
            ) : (
              pendingCompletions.map(c => (
                <View key={c.id} style={s.card}>
                  <View style={s.cardTop}>
                    <Text style={s.cardTitle}>{getChoreName(c.choreId)}</Text>
                    <Text style={s.kidLabel}>{getKidName(c.kidId)}</Text>
                  </View>
                  <Text style={s.cardMeta}>Submitted {formatTime(c.submittedAt)}</Text>
                  <Text style={s.cardMeta}>Due: {c.dueDate}</Text>
                  {c.photoUri && <Text style={s.photoNote}>📷 Photo attached</Text>}
                  <View style={s.actions}>
                    <TouchableOpacity style={[s.btn, s.approveBtn]} onPress={() => approveCompletion(c.id)}>
                      <Text style={s.approveBtnText}>Approve ✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.btn, s.rejectBtn]} onPress={() => rejectCompletion(c.id)}>
                      <Text style={s.rejectBtnText}>Reject ✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Redemptions */}
            <Text style={[s.sectionTitle, { marginTop: 24 }]}>Reward requests</Text>
            {pendingRedemptions.length === 0 ? (
              <Text style={s.empty}>No pending requests.</Text>
            ) : (
              pendingRedemptions.map(r => (
                <View key={r.id} style={s.card}>
                  <View style={s.cardTop}>
                    <Text style={s.cardTitle}>{getRewardName(r.rewardId)}</Text>
                    <Text style={s.kidLabel}>{getKidName(r.kidId)}</Text>
                  </View>
                  <Text style={s.cardMeta}>Requested {formatTime(r.requestedAt)}</Text>
                  <Text style={s.cardMeta}>Cost: ⭐ {r.starsDeducted} (already deducted)</Text>
                  <View style={s.actions}>
                    <TouchableOpacity style={[s.btn, s.approveBtn]} onPress={() => approveRedemption(r.id)}>
                      <Text style={s.approveBtnText}>Approve ✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.btn, s.rejectBtn]} onPress={() => declineRedemption(r.id)}>
                      <Text style={s.rejectBtnText}>Decline (refund)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Still to give */}
            {toGive.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { marginTop: 24 }]}>Still to give</Text>
                {toGive.map(r => (
                  <View key={r.id} style={[s.card, { borderLeftWidth: 4, borderLeftColor: COLORS.star }]}>
                    <View style={s.cardTop}>
                      <Text style={s.cardTitle}>{getRewardName(r.rewardId)}</Text>
                      <Text style={s.kidLabel}>{getKidName(r.kidId)}</Text>
                    </View>
                    <TouchableOpacity style={[s.btn, s.approveBtn, { alignSelf: 'flex-start', marginTop: 8 }]} onPress={() => markRewardGiven(r.id)}>
                      <Text style={s.approveBtnText}>Mark given 🎁</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {totalPending === 0 && toGive.length === 0 && (
              <View style={s.allDone}>
                <Text style={s.allDoneEmoji}>🎉</Text>
                <Text style={s.allDoneText}>All caught up!</Text>
              </View>
            )}
          </View>
        }
        keyExtractor={() => 'header'}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  screenTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  badge: { backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  empty: { color: COLORS.textSecondary, fontSize: 14, fontStyle: 'italic', marginBottom: 8 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  kidLabel: { backgroundColor: COLORS.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  cardMeta: { fontSize: 13, color: COLORS.textSecondary },
  photoNote: { fontSize: 13, color: COLORS.primary },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  approveBtn: { backgroundColor: COLORS.success },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rejectBtn: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.danger },
  rejectBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 14 },
  allDone: { alignItems: 'center', marginTop: 60, gap: 8 },
  allDoneEmoji: { fontSize: 48 },
  allDoneText: { fontSize: 18, fontWeight: '600', color: COLORS.textSecondary },
});
