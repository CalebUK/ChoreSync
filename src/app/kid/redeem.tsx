import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useStore, COLORS } from '@/store';

export default function KidRedeemScreen() {
  const { state, requestRedemption, getBalance } = useStore();

  const kid = state.kids.find(k => k.id === state.currentKidId);
  if (!kid) { router.replace('/kid'); return null; }

  const kidId = kid.id; // capture after null-check so closures see string, not string|undefined
  const balance = getBalance(kidId);
  const activeRewards = state.rewards.filter(r => r.isActive);
  const myRedemptions = state.redemptions.filter(r => r.kidId === kidId);
  const pendingRedemptions = myRedemptions.filter(r => r.status === 'requested' || r.status === 'approved');

  function handleRedeem(rewardId: string, title: string, cost: number) {
    if (balance < cost) {
      Alert.alert('Not enough stars', `You need ⭐ ${cost} but only have ⭐ ${balance}.`);
      return;
    }
    Alert.alert(`Redeem "${title}"?`, `This will use ⭐ ${cost} stars right away.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Redeem', onPress: () => requestRedemption(rewardId, kidId) },
    ]);
  }

  function getRewardTitle(rewardId: string) {
    return state.rewards.find(r => r.id === rewardId)?.title ?? 'Unknown';
  }

  function statusLabel(status: string) {
    if (status === 'requested') return '⏳ Waiting for approval';
    if (status === 'approved') return '✅ Approved — ask your parent!';
    return '';
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.titleRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Rewards</Text>
        <View style={s.balancePill}>
          <Text style={s.balanceText}>⭐ {balance}</Text>
        </View>
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        keyExtractor={() => 'k'}
        ListHeaderComponent={
          <View style={{ paddingBottom: 40 }}>
            <Text style={s.sectionTitle}>Reward chart</Text>

            {activeRewards.length === 0 ? (
              <Text style={s.empty}>No rewards set up yet.</Text>
            ) : (
              activeRewards.map(reward => {
                const canAfford = balance >= reward.starCost;
                const alreadyPending = pendingRedemptions.some(r => r.rewardId === reward.id);
                return (
                  <View key={reward.id} style={[s.rewardCard, !canAfford && s.rewardCardFaded]}>
                    <View style={s.rewardBody}>
                      <Text style={s.rewardTitle}>{reward.title}</Text>
                      {reward.description ? <Text style={s.rewardDesc}>{reward.description}</Text> : null}
                      <Text style={[s.rewardCost, !canAfford && { color: COLORS.danger }]}>
                        ⭐ {reward.starCost}
                        {!canAfford && ` (need ${reward.starCost - balance} more)`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[s.redeemBtn, (!canAfford || alreadyPending) && s.redeemBtnDisabled]}
                      onPress={() => handleRedeem(reward.id, reward.title, reward.starCost)}
                      disabled={!canAfford || alreadyPending}
                      activeOpacity={0.8}
                    >
                      <Text style={s.redeemBtnText}>
                        {alreadyPending ? 'Pending' : 'Redeem'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            {pendingRedemptions.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { marginTop: 24 }]}>My requests</Text>
                {pendingRedemptions.map(r => (
                  <View key={r.id} style={s.pendingCard}>
                    <Text style={s.pendingTitle}>{getRewardTitle(r.rewardId)}</Text>
                    <Text style={s.pendingStatus}>{statusLabel(r.status)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  back: { color: COLORS.textSecondary, fontSize: 15, padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  balancePill: { backgroundColor: COLORS.star + '22', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  balanceText: { color: COLORS.star, fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, marginBottom: 10, marginTop: 8 },
  empty: { color: COLORS.textSecondary, fontSize: 15, fontStyle: 'italic', paddingHorizontal: 16 },
  rewardCard: { backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardCardFaded: { opacity: 0.7 },
  rewardBody: { flex: 1, gap: 3 },
  rewardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  rewardDesc: { fontSize: 13, color: COLORS.textSecondary },
  rewardCost: { fontSize: 14, fontWeight: '700', color: COLORS.star },
  redeemBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  redeemBtnDisabled: { backgroundColor: COLORS.border },
  redeemBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pendingCard: { backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, gap: 4 },
  pendingTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  pendingStatus: { fontSize: 13, color: COLORS.textSecondary },
});
