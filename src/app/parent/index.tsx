import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, FlatList,
  ScrollView, Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useStore, COLORS, getOccurrenceDate, getUrgency, URGENCY_COLORS, todayStr } from '@/store';
import type { Kid, Chore } from '@/types';

const AVATAR_COLORS = ['#EC4899', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EF4444'];

function ChoreIcon({ icon, size = 18 }: { icon?: string; size?: number }) {
  if (!icon) return null;
  return <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={size} color={COLORS.textSecondary} />;
}

export default function FamilyScreen() {
  const { state, setRole, setCurrentKid, addKid, updateKid, removeKid, addBonus, getBalance, updateChore } = useStore();
  const today = todayStr();

  const pendingCount = state.completions.filter(c => c.status === 'submitted').length
    + state.redemptions.filter(r => r.status === 'requested').length;

  const [detailKid, setDetailKid] = useState<Kid | null>(null);
  const [showAddKid, setShowAddKid] = useState(false);
  const [kidForm, setKidForm] = useState({ name: '', pin: '', color: AVATAR_COLORS[0] });
  const [bonusKid, setBonusKid] = useState<Kid | null>(null);
  const [bonusVal, setBonusVal] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  // Reassign sheet
  const [reassignChore, setReassignChore] = useState<Chore | null>(null);

  function handleSaveKid() {
    if (!kidForm.name.trim()) return Alert.alert('Name required');
    if (!/^\d{4}$/.test(kidForm.pin)) return Alert.alert('PIN must be 4 digits');
    addKid(kidForm.name.trim(), kidForm.pin, kidForm.color);
    setShowAddKid(false);
    setKidForm({ name: '', pin: '', color: AVATAR_COLORS[0] });
  }

  function handleBonus() {
    const n = parseInt(bonusVal, 10);
    if (!bonusKid || isNaN(n) || n === 0) return Alert.alert('Enter a non-zero number');
    addBonus(bonusKid.id, n, bonusNote.trim() || undefined);
    setBonusKid(null);
  }

  function handleDeleteKid(kid: Kid) {
    Alert.alert(`Remove ${kid.name}?`, 'History is kept; only the profile is removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { removeKid(kid.id); setDetailKid(null); } },
    ]);
  }

  function handleReassign(kid: Kid) {
    if (!reassignChore) return;
    updateChore(reassignChore.id, { assignment: { kid: true, kidId: kid.id } });
    setReassignChore(null);
  }

  const detailChores = detailKid
    ? state.chores.filter(c => 'kid' in c.assignment && c.assignment.kidId === detailKid.id)
    : [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Family</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => setShowAddKid(true)} style={s.addKidBtn}>
            <Text style={s.addKidText}>+ Kid</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={async () => {
            await AsyncStorage.multiRemove(['@choreSync/session', '@choreSync/bioSession']).catch(() => {});
            setRole(null);
            router.replace('/');
          }} style={s.exitBtn}>
            <Text style={s.exitText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.section}>
          {state.kids.map(kid => {
            const balance = getBalance(kid.id);
            return (
              <TouchableOpacity key={kid.id} style={s.kidRow} onPress={() => setDetailKid(kid)} activeOpacity={0.7}>
                <View style={[s.avatar, { backgroundColor: kid.avatarColor }]}>
                  <Text style={s.avatarText}>{kid.name[0].toUpperCase()}</Text>
                </View>
                <Text style={s.kidName}>{kid.name}</Text>
                <Ionicons name="star" size={14} color={COLORS.star} />
                <Text style={s.starCount}>{balance}</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            );
          })}
          {state.kids.length === 0 && (
            <Text style={s.empty}>No kids yet. Tap "+ Kid" to add one.</Text>
          )}
        </View>

        {pendingCount > 0 && (
          <TouchableOpacity style={s.pendingBanner} onPress={() => router.navigate('/parent/approvals')} activeOpacity={0.7}>
            <View style={s.pendingIcon}>
              <Ionicons name="time-outline" size={22} color={COLORS.textSecondary} />
            </View>
            <Text style={s.pendingText}>{pendingCount} item{pendingCount !== 1 ? 's' : ''} waiting for review</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Kid detail modal */}
      <Modal visible={detailKid !== null} animationType="slide" presentationStyle="pageSheet">
        {detailKid && (
          <SafeAreaView style={s.safe}>
            <View style={s.modalHeader}>
              <View style={[s.avatar, { backgroundColor: detailKid.avatarColor }]}>
                <Text style={s.avatarText}>{detailKid.name[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>{detailKid.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="star" size={13} color={COLORS.star} />
                  <Text style={s.modalSub}>{getBalance(detailKid.id)} stars</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setDetailKid(null)}>
                <Text style={s.closeBtn}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
              <Text style={s.sectionLabel}>Assigned chores</Text>
              {detailChores.map(chore => {
                const dueDate = getOccurrenceDate(chore.repeatRule, today);
                const urgency = getUrgency(dueDate, today);
                const completion = state.completions.find(
                  co => co.choreId === chore.id && co.kidId === detailKid.id && co.dueDate === dueDate && co.status !== 'rejected'
                );
                return (
                  <View key={chore.id} style={s.choreRow}>
                    <View style={[s.urgencyDot, { backgroundColor: URGENCY_COLORS[urgency] }]} />
                    {chore.icon && (
                      <Ionicons name={chore.icon as React.ComponentProps<typeof Ionicons>['name']} size={16} color={COLORS.textSecondary} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.choreTitle}>{chore.title}</Text>
                      <Text style={s.choreMeta}>{dueDate}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: 8 }}>
                      <Ionicons name="star" size={12} color={COLORS.star} />
                      <Text style={s.choreStars}>{chore.stars}</Text>
                    </View>
                    {completion && (
                      <Ionicons
                        name={completion.status === 'approved' ? 'checkmark-circle' : 'time-outline'}
                        size={16}
                        color={completion.status === 'approved' ? COLORS.success : COLORS.star}
                      />
                    )}
                    {/* Reassign */}
                    <TouchableOpacity
                      onPress={() => setReassignChore(chore)}
                      style={s.choreAction}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="swap-horizontal-outline" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                    {/* Edit */}
                    <TouchableOpacity
                      onPress={() => { setDetailKid(null); router.push({ pathname: '/parent/edit-chore', params: { choreId: chore.id } }); }}
                      style={s.choreAction}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="create-outline" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                );
              })}
              {detailChores.length === 0 && (
                <Text style={s.empty}>No chores assigned.</Text>
              )}

              <TouchableOpacity
                style={[s.actionRow, { marginTop: 8 }]}
                onPress={() => { setDetailKid(null); setBonusKid(detailKid); setBonusVal(''); setBonusNote(''); }}
              >
                <Ionicons name="star-outline" size={16} color={COLORS.primary} />
                <Text style={s.actionText}>Give bonus stars</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionRow} onPress={() => handleDeleteKid(detailKid)}>
                <Text style={[s.actionText, { color: COLORS.danger }]}>Remove {detailKid.name}</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Reassign sheet */}
      <Modal visible={reassignChore !== null} animationType="slide" presentationStyle="pageSheet" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Reassign "{reassignChore?.title}"</Text>
            <Text style={s.sheetSub}>Pick who this chore goes to</Text>
            {state.kids.map(kid => (
              <TouchableOpacity key={kid.id} style={s.kidPill} onPress={() => handleReassign(kid)} activeOpacity={0.8}>
                <View style={[s.avatar, { backgroundColor: kid.avatarColor }]}>
                  <Text style={s.avatarText}>{kid.name[0]}</Text>
                </View>
                <Text style={s.kidPillName}>{kid.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.cancelBtn} onPress={() => setReassignChore(null)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Kid modal */}
      <Modal visible={showAddKid} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add a kid</Text>
              <TouchableOpacity onPress={() => setShowAddKid(false)}>
                <Text style={s.closeBtn}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.form}>
              <Text style={s.formLabel}>Name</Text>
              <TextInput
                style={s.input}
                value={kidForm.name}
                onChangeText={t => setKidForm(f => ({ ...f, name: t }))}
                placeholder="e.g. Mia"
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={s.formLabel}>4-digit PIN</Text>
              <TextInput
                style={s.input}
                value={kidForm.pin}
                onChangeText={t => setKidForm(f => ({ ...f, pin: t.replace(/\D/g, '').slice(0, 4) }))}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                placeholder="1234"
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={s.formLabel}>Colour</Text>
              <View style={s.colorRow}>
                {AVATAR_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[s.swatch, { backgroundColor: c }, kidForm.color === c && s.swatchSelected]}
                    onPress={() => setKidForm(f => ({ ...f, color: c }))}
                  />
                ))}
              </View>
              <TouchableOpacity style={s.saveBtn} onPress={handleSaveKid}>
                <Text style={s.saveBtnText}>Add</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Bonus modal */}
      <Modal visible={bonusKid !== null} animationType="slide" presentationStyle="pageSheet" transparent>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.bonusSheet}>
              <Text style={s.modalTitle}>Bonus for {bonusKid?.name}</Text>
              <Text style={s.formLabel}>Stars (negative to deduct)</Text>
              <TextInput
                style={s.input}
                value={bonusVal}
                onChangeText={setBonusVal}
                keyboardType="numbers-and-punctuation"
                placeholder="5"
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={s.formLabel}>Note (optional)</Text>
              <TextInput
                style={s.input}
                value={bonusNote}
                onChangeText={setBonusNote}
                placeholder="e.g. Helping without being asked"
                placeholderTextColor={COLORS.textSecondary}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity style={[s.saveBtn, { flex: 1, backgroundColor: COLORS.cardElevated }]} onPress={() => setBonusKid(null)}>
                  <Text style={[s.saveBtnText, { color: COLORS.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.saveBtn, { flex: 1 }]} onPress={handleBonus}>
                  <Text style={s.saveBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary },
  addKidBtn: { backgroundColor: COLORS.cardElevated, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addKidText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  exitBtn: { paddingHorizontal: 8, paddingVertical: 7 },
  exitText: { color: COLORS.textSecondary, fontSize: 14 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  section: { backgroundColor: COLORS.card, borderRadius: 16, overflow: 'hidden', marginBottom: 14 },
  kidRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  kidName: { flex: 1, fontSize: 17, fontWeight: '600', color: COLORS.textPrimary },
  starCount: { fontSize: 15, color: COLORS.star, fontWeight: '600' },
  empty: { color: COLORS.textSecondary, padding: 16, textAlign: 'center', fontSize: 14 },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, padding: 14, gap: 12 },
  pendingIcon: { width: 42, height: 42, borderRadius: 10, backgroundColor: COLORS.cardElevated, alignItems: 'center', justifyContent: 'center' },
  pendingText: { flex: 1, fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
  // Modals
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { flex: 1, fontSize: 19, fontWeight: '700', color: COLORS.textPrimary },
  modalSub: { fontSize: 13, color: COLORS.star },
  closeBtn: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  choreRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 10, gap: 8 },
  urgencyDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  choreTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  choreMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  choreStars: { fontSize: 13, color: COLORS.star },
  choreAction: { padding: 2 },
  actionRow: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  actionText: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  // Reassign sheet
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 10 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  sheetSub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  kidPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardElevated, borderRadius: 14, padding: 14, gap: 12 },
  kidPillName: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  cancelBtn: { backgroundColor: COLORS.bg, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
  // Add kid form
  form: { padding: 20, gap: 6, paddingBottom: 40 },
  formLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 10 },
  input: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: COLORS.textPrimary },
  colorRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  swatch: { width: 38, height: 38, borderRadius: 19 },
  swatchSelected: { borderWidth: 3, borderColor: '#fff' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bonusSheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 6 },
});
