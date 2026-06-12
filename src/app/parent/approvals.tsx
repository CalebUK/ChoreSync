import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, COLORS } from '@/store';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ParentApprovalsScreen() {
  const { state, approveCompletion, rejectCompletion, approveRedemption, declineRedemption, markRewardGiven } = useStore();

  const pendingCompletions = state.completions.filter(c => c.status === 'submitted');
  const pendingRedemptions = state.redemptions.filter(r => r.status === 'requested');
  const toGive = state.redemptions.filter(r => r.status === 'approved');

  const totalPending = pendingCompletions.length + pendingRedemptions.length;

  function getKidName(kidId: string) { return state.kids.find(k => k.id === kidId)?.name ?? 'Unknown'; }
  function getKidColor(kidId: string) { return state.kids.find(k => k.id === kidId)?.avatarColor ?? COLORS.border; }
  function getChoreName(choreId: string) { return state.chores.find(c => c.id === choreId)?.title ?? 'Unknown'; }
  function getChoreStars(choreId: string) { return state.chores.find(c => c.id === choreId)?.stars ?? 0; }
  function getRewardName(rewardId: string) { return state.rewards.find(r => r.id === rewardId)?.title ?? 'Unknown'; }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.titleRow}>
        <Text style={s.screenTitle}>Approvals</Text>
        {totalPending > 0 && (
          <View style={s.badge}><Text style={s.badgeText}>{totalPending}</Text></View>
        )}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* Chore completions */}
        {pendingCompletions.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Chore completions</Text>
            {pendingCompletions.map(c => {
              const stars = getChoreStars(c.choreId);
              const kidColor = getKidColor(c.kidId);
              return (
                <View key={c.id} style={s.card}>
                  {/* Kid + chore header */}
                  <View style={s.cardHeader}>
                    <View style={[s.kidDot, { backgroundColor: kidColor }]}>
                      <Text style={s.kidDotText}>{getKidName(c.kidId)[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>{getChoreName(c.choreId)}</Text>
                      <Text style={s.cardSub}>{getKidName(c.kidId)} · {timeAgo(c.submittedAt)}</Text>
                    </View>
                    <Text style={s.starBadge}>☆ {stars}</Text>
                  </View>

                  {/* Photo placeholder */}
                  <View style={s.photoArea}>
                    {c.photoUri ? (
                      <Text style={s.photoPlaceholderText}>📷 Photo attached</Text>
                    ) : (
                      <View style={s.photoPlaceholder}>
                        <Text style={s.photoIcon}>📷</Text>
                        <Text style={s.photoMeta}>No photo · {timeAgo(c.submittedAt)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Due date row */}
                  <Text style={s.dueText}>Due {c.dueDate}</Text>

                  {/* Actions */}
                  <View style={s.actions}>
                    <TouchableOpacity style={s.approveBtn} onPress={() => approveCompletion(c.id)} activeOpacity={0.8}>
                      <Text style={s.approveBtnText}>✓ Approve · {stars}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.rejectBtn} onPress={() => rejectCompletion(c.id)} activeOpacity={0.8}>
                      <Text style={s.rejectBtnText}>✕ Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Reward requests */}
        {pendingRedemptions.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Reward requests</Text>
            {pendingRedemptions.map(r => {
              const kidColor = getKidColor(r.kidId);
              return (
                <View key={r.id} style={s.card}>
                  <View style={s.cardHeader}>
                    <View style={[s.kidDot, { backgroundColor: kidColor }]}>
                      <Text style={s.kidDotText}>{getKidName(r.kidId)[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>{getRewardName(r.rewardId)}</Text>
                      <Text style={s.cardSub}>{getKidName(r.kidId)} · {timeAgo(r.requestedAt)}</Text>
                    </View>
                    <Text style={s.starBadge}>☆ {r.starsDeducted}</Text>
                  </View>

                  <View style={s.infoRow}>
                    <Text style={s.infoText}>Stars already deducted from balance</Text>
                  </View>

                  <View style={s.actions}>
                    <TouchableOpacity style={s.approveBtn} onPress={() => approveRedemption(r.id)} activeOpacity={0.8}>
                      <Text style={s.approveBtnText}>✓ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.rejectBtn} onPress={() => declineRedemption(r.id)} activeOpacity={0.8}>
                      <Text style={s.rejectBtnText}>✕ Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Still to give */}
        {toGive.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Still to give</Text>
            {toGive.map(r => (
              <View key={r.id} style={[s.card, s.cardGive]}>
                <View style={s.cardHeader}>
                  <View style={[s.kidDot, { backgroundColor: getKidColor(r.kidId) }]}>
                    <Text style={s.kidDotText}>{getKidName(r.kidId)[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{getRewardName(r.rewardId)}</Text>
                    <Text style={s.cardSub}>{getKidName(r.kidId)}</Text>
                  </View>
                </View>
                <TouchableOpacity style={[s.approveBtn, { marginTop: 10 }]} onPress={() => markRewardGiven(r.id)} activeOpacity={0.8}>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  screenTitle: { fontSize: 26, fontWeight: '700', color: COLORS.textPrimary },
  badge: { backgroundColor: COLORS.danger, borderRadius: 10, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 48 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardGive: { borderLeftWidth: 3, borderLeftColor: COLORS.star },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  kidDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  kidDotText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  cardSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  starBadge: { fontSize: 15, color: COLORS.star, fontWeight: '700' },
  photoArea: { backgroundColor: COLORS.cardElevated, borderRadius: 10, minHeight: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  photoPlaceholder: { alignItems: 'center', gap: 6, paddingVertical: 16 },
  photoIcon: { fontSize: 28, opacity: 0.4 },
  photoMeta: { fontSize: 12, color: COLORS.textSecondary },
  photoPlaceholderText: { color: COLORS.primary, fontSize: 14 },
  dueText: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  infoRow: { backgroundColor: COLORS.cardElevated, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  infoText: { fontSize: 13, color: COLORS.textSecondary },
  actions: { flexDirection: 'row', gap: 8 },
  approveBtn: { flex: 1, backgroundColor: COLORS.success, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  rejectBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderLight },
  rejectBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 15 },
  allDone: { alignItems: 'center', marginTop: 80, gap: 10 },
  allDoneEmoji: { fontSize: 52 },
  allDoneText: { fontSize: 18, fontWeight: '600', color: COLORS.textSecondary },
});
