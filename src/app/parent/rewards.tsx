import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal,
  TextInput, KeyboardAvoidingView, Platform, Switch, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore, COLORS } from '@/store';
import type { Reward } from '@/types';

interface RewardForm { title: string; description: string; starCost: string; isActive: boolean }
const emptyForm = (): RewardForm => ({ title: '', description: '', starCost: '15', isActive: true });

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_COLORS: Record<string, string> = {
  requested: COLORS.star,
  approved: COLORS.primary,
  given: COLORS.success,
  declined: COLORS.danger,
};

const STATUS_LABELS: Record<string, string> = {
  requested: 'Pending',
  approved: 'Approved',
  given: 'Given',
  declined: 'Declined',
};

export default function ParentRewardsScreen() {
  const { state, addReward, updateReward, deleteReward, markRewardGiven } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RewardForm>(emptyForm());

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  }

  function openEdit(reward: Reward) {
    setEditingId(reward.id);
    setForm({ title: reward.title, description: reward.description ?? '', starCost: String(reward.starCost), isActive: reward.isActive });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.title.trim()) return Alert.alert('Title required');
    const cost = parseInt(form.starCost, 10);
    if (isNaN(cost) || cost < 1) return Alert.alert('Star cost must be at least 1');
    const data = { title: form.title.trim(), description: form.description.trim() || undefined, starCost: cost, isActive: form.isActive };
    if (editingId) {
      updateReward(editingId, data);
    } else {
      addReward(data);
    }
    setShowModal(false);
  }

  function handleDelete(id: string, title: string) {
    Alert.alert(`Delete "${title}"?`, '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteReward(id) },
    ]);
  }

  function getKidName(kidId: string) { return state.kids.find(k => k.id === kidId)?.name ?? 'Unknown'; }
  function getRewardTitle(rewardId: string) { return state.rewards.find(r => r.id === rewardId)?.title ?? 'Unknown'; }
  function getKidColor(kidId: string) { return state.kids.find(k => k.id === kidId)?.avatarColor ?? COLORS.border; }

  const allRedemptions = [...state.redemptions].sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.titleRow}>
        <Text style={s.screenTitle}>Rewards</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {/* Rewards list */}
        {state.rewards.length === 0 ? (
          <Text style={s.empty}>No rewards yet. Tap "+ Add" to create one.</Text>
        ) : (
          state.rewards.map(item => (
            <View key={item.id} style={[s.card, !item.isActive && s.cardInactive]}>
              <View style={s.cardBody}>
                <View style={s.cardRow}>
                  <Text style={s.rewardTitle}>{item.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="star" size={13} color={COLORS.star} />
                    <Text style={s.starCost}>{item.starCost}</Text>
                  </View>
                </View>
                {item.description ? <Text style={s.desc}>{item.description}</Text> : null}
                {!item.isActive && <Text style={s.inactiveLabel}>Hidden from kids</Text>}
              </View>
              <View style={s.cardActions}>
                <Switch
                  value={item.isActive}
                  onValueChange={v => updateReward(item.id, { isActive: v })}
                  trackColor={{ true: COLORS.success }}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
                <TouchableOpacity onPress={() => openEdit(item)} style={s.actionBtn}>
                  <Text style={s.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.title)}>
                  <Ionicons name="close" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Redemption history */}
        {allRedemptions.length > 0 && (
          <>
            <Text style={s.historyLabel}>Redemption history</Text>
            {allRedemptions.map(r => {
              const kidColor = getKidColor(r.kidId);
              const statusColor = STATUS_COLORS[r.status] ?? COLORS.textSecondary;
              return (
                <View key={r.id} style={s.historyCard}>
                  <View style={s.historyHeader}>
                    <View style={[s.kidDot, { backgroundColor: kidColor }]}>
                      <Text style={s.kidDotText}>{getKidName(r.kidId)[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.historyReward}>{getRewardTitle(r.rewardId)}</Text>
                      <Text style={s.historySub}>{getKidName(r.kidId)} · {timeAgo(r.requestedAt)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 }}>
                      <Ionicons name="star" size={12} color={COLORS.star} />
                      <Text style={s.historyStars}>{r.starsDeducted}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: statusColor + '22' }]}>
                      <Text style={[s.statusText, { color: statusColor }]}>{STATUS_LABELS[r.status]}</Text>
                    </View>
                  </View>
                  {r.status === 'approved' && (
                    <TouchableOpacity style={s.giveBtn} onPress={() => markRewardGiven(r.id)} activeOpacity={0.8}>
                      <Ionicons name="gift-outline" size={15} color="#fff" />
                      <Text style={s.giveBtnText}>Mark as given</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={s.form}>
              <View style={s.formHeader}>
                <Text style={s.formTitle}>{editingId ? 'Edit Reward' : 'New Reward'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Title</Text>
              <TextInput
                style={s.input}
                value={form.title}
                onChangeText={t => setForm(f => ({ ...f, title: t }))}
                placeholder="e.g. Movie night"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={s.label}>Description (optional)</Text>
              <TextInput
                style={s.input}
                value={form.description}
                onChangeText={t => setForm(f => ({ ...f, description: t }))}
                placeholder="e.g. A movie of your choice"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={s.label}>Star cost</Text>
              <TextInput
                style={s.input}
                value={form.starCost}
                onChangeText={t => setForm(f => ({ ...f, starCost: t }))}
                keyboardType="numeric"
                placeholder="15"
                placeholderTextColor={COLORS.textSecondary}
              />

              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>Show to kids</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={v => setForm(f => ({ ...f, isActive: v }))}
                  trackColor={{ true: COLORS.primary }}
                />
              </View>

              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  screenTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60, fontSize: 15 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardInactive: { opacity: 0.6 },
  cardBody: { flex: 1, gap: 3 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  starCost: { fontSize: 15, color: COLORS.star, fontWeight: '700' },
  desc: { fontSize: 13, color: COLORS.textSecondary },
  inactiveLabel: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: { backgroundColor: COLORS.bg, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  actionBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  // History
  historyLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  historyCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kidDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  kidDotText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  historyReward: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  historySub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  historyStars: { fontSize: 13, color: COLORS.star, fontWeight: '700' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  giveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.success, borderRadius: 10, paddingVertical: 10, marginTop: 12 },
  giveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Form
  form: { paddingHorizontal: 20, paddingBottom: 40 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  formTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 14, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: COLORS.textPrimary },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  toggleLabel: { fontSize: 16, color: COLORS.textPrimary },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
