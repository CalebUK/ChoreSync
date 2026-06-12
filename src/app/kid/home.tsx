import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useStore, COLORS, URGENCY_COLORS, todayStr, getOccurrenceDate, getUrgency,
} from '@/store';
import type { Chore } from '@/types';

export default function KidHomeScreen() {
  const { state, setCurrentKid, setRole, getBalance } = useStore();
  const today = todayStr();

  const kid = state.kids.find(k => k.id === state.currentKidId);
  if (!kid) {
    router.replace('/kid');
    return null;
  }

  const kidId = kid.id; // capture after null-check so closures see Kid, not Kid|undefined
  const balance = getBalance(kidId);

  function hasActiveCompletion(chore: Chore, dueDate: string): boolean {
    return state.completions.some(
      c => c.choreId === chore.id && c.kidId === kidId && c.dueDate === dueDate && c.status !== 'rejected'
    );
  }

  function getCompletionStatus(chore: Chore, dueDate: string) {
    return state.completions.find(
      c => c.choreId === chore.id && c.kidId === kidId && c.dueDate === dueDate && c.status !== 'rejected'
    )?.status ?? null;
  }

  const assignedChores = state.chores.filter(chore => {
    if ('kid' in chore.assignment) return chore.assignment.kidId === kidId;
    if ('free' in chore.assignment) {
      // Show if unclaimed or claimed by this kid
      return chore.ownerId == null || chore.ownerId === kidId;
    }
    if ('everyone' in chore.assignment) return true;
    return false;
  });

  const pending = assignedChores.filter(c => {
    const dueDate = getOccurrenceDate(c.repeatRule, today);
    return !hasActiveCompletion(c, dueDate);
  }).sort((a, b) => {
    const dA = getOccurrenceDate(a.repeatRule, today);
    const dB = getOccurrenceDate(b.repeatRule, today);
    return dA < dB ? -1 : dA > dB ? 1 : 0;
  });

  const done = assignedChores.filter(c => {
    const dueDate = getOccurrenceDate(c.repeatRule, today);
    return hasActiveCompletion(c, dueDate);
  });

  function renderChore({ item }: { item: Chore }) {
    const dueDate = getOccurrenceDate(item.repeatRule, today);
    const urgency = getUrgency(dueDate, today);
    const status = getCompletionStatus(item, dueDate);

    const isDone = status !== null;
    return (
      <TouchableOpacity
        style={[s.choreCard, isDone && s.choreCardDone]}
        onPress={() => {
          if (!isDone) router.push({ pathname: '/kid/complete', params: { choreId: item.id, dueDate } });
        }}
        activeOpacity={isDone ? 1 : 0.8}
      >
        <View style={[s.urgencyBar, { backgroundColor: isDone ? COLORS.success : URGENCY_COLORS[urgency] }]} />
        <View style={s.choreBody}>
          <View style={s.choreRow}>
            {item.icon ? <Text style={s.choreIcon}>{item.icon}</Text> : null}
            <Text style={[s.choreTitle, isDone && s.choreTextDone]}>{item.title}</Text>
            <Text style={s.choreStars}>⭐ {item.stars}</Text>
          </View>
          <View style={s.choreRow}>
            <Text style={s.choreMeta}>
              {'once' in item.repeatRule ? `Due ${item.repeatRule.date}` :
               'daily' in item.repeatRule ? 'Daily' :
               `Weekly`}
            </Text>
            {isDone ? (
              <Text style={s.statusLabel}>
                {status === 'submitted' ? '⏳ Awaiting approval' : '✓ Done'}
              </Text>
            ) : (
              <Text style={[s.choreDue, { color: URGENCY_COLORS[urgency] }]}>{dueDate}</Text>
            )}
          </View>
          {item.requiresApproval && !isDone && <Text style={s.badge}>Needs parent approval</Text>}
          {item.requiresPhoto && !isDone && <Text style={s.badge}>📷 Photo required</Text>}
        </View>
        {!isDone && <Text style={s.arrow}>›</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: kid.avatarColor }]}>
        <View>
          <Text style={s.greeting}>Hi, {kid.name}!</Text>
          <Text style={s.balanceLabel}>Your balance</Text>
        </View>
        <View style={s.balanceBadge}>
          <Text style={s.balanceNum}>{balance}</Text>
          <Text style={s.balanceStar}>⭐</Text>
        </View>
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        keyExtractor={() => 'key'}
        ListHeaderComponent={
          <View style={{ paddingBottom: 24 }}>
            {/* To Do */}
            <Text style={s.sectionTitle}>To do ({pending.length})</Text>
            {pending.length === 0 ? (
              <Text style={s.empty}>Nothing left to do! 🎉</Text>
            ) : (
              pending.map(item => renderChore({ item }))
            )}

            {/* Done */}
            {done.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { marginTop: 20 }]}>Done today ({done.length})</Text>
                {done.map(item => renderChore({ item }))}
              </>
            )}

            {/* Rewards button */}
            <TouchableOpacity
              style={s.redeemBtn}
              onPress={() => router.push('/kid/redeem')}
              activeOpacity={0.8}
            >
              <Text style={s.redeemBtnText}>🎁 Redeem rewards ({balance} ⭐)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.switchBtn}
              onPress={async () => {
                await AsyncStorage.multiRemove(['@choreSync/session', '@choreSync/bioSession']).catch(() => {});
                setCurrentKid(null);
                setRole(null);
                router.replace('/');
              }}
            >
              <Text style={s.switchBtnText}>Switch account</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 24, fontWeight: '700', color: '#fff' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  balanceBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  balanceNum: { fontSize: 28, fontWeight: '800', color: '#fff' },
  balanceStar: { fontSize: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  empty: { color: COLORS.textSecondary, fontSize: 15, fontStyle: 'italic', paddingHorizontal: 16 },
  choreCard: { flexDirection: 'row', backgroundColor: COLORS.surface, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
  choreCardDone: { opacity: 0.7 },
  urgencyBar: { width: 5 },
  choreBody: { flex: 1, padding: 12, gap: 4 },
  choreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  choreIcon: { fontSize: 18 },
  choreTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  choreTextDone: { color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  choreStars: { fontSize: 14, color: COLORS.star, fontWeight: '600' },
  choreMeta: { fontSize: 12, color: COLORS.textSecondary },
  choreDue: { fontSize: 12, fontWeight: '600' },
  statusLabel: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
  badge: { backgroundColor: COLORS.bg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, fontSize: 11, color: COLORS.textSecondary, alignSelf: 'flex-start' },
  arrow: { fontSize: 22, color: COLORS.textSecondary, paddingRight: 12, paddingTop: 14 },
  redeemBtn: { backgroundColor: COLORS.primary, margin: 16, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  redeemBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn: { alignItems: 'center', marginTop: 4 },
  switchBtnText: { color: COLORS.textSecondary, fontSize: 14 },
});
