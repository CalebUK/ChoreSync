import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal,
  TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, COLORS } from '@/store';

const AVATAR_COLORS = ['#EC4899', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EF4444'];

interface KidForm { name: string; pin: string; color: string }
const emptyKidForm = (): KidForm => ({ name: '', pin: '', color: AVATAR_COLORS[0] });

export default function ParentKidsScreen() {
  const { state, addKid, updateKid, removeKid, addBonus, getBalance } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<KidForm>(emptyKidForm());

  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusKidId, setBonusKidId] = useState<string | null>(null);
  const [bonusStars, setBonusStars] = useState('');
  const [bonusNote, setBonusNote] = useState('');

  function openAdd() {
    setEditingId(null);
    setForm(emptyKidForm());
    setShowModal(true);
  }

  function openEdit(id: string) {
    const kid = state.kids.find(k => k.id === id);
    if (!kid) return;
    setEditingId(id);
    setForm({ name: kid.name, pin: kid.pin, color: kid.avatarColor });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name.trim()) return Alert.alert('Name required');
    if (!/^\d{4}$/.test(form.pin)) return Alert.alert('PIN must be exactly 4 digits');
    if (editingId) {
      updateKid(editingId, { name: form.name.trim(), pin: form.pin, avatarColor: form.color });
    } else {
      addKid(form.name.trim(), form.pin, form.color);
    }
    setShowModal(false);
  }

  function handleDelete(id: string, name: string) {
    Alert.alert(`Remove ${name}?`, 'Their chores and history will remain, but their profile will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeKid(id) },
    ]);
  }

  function openBonus(kidId: string) {
    setBonusKidId(kidId);
    setBonusStars('');
    setBonusNote('');
    setShowBonusModal(true);
  }

  function handleBonus() {
    const n = parseInt(bonusStars, 10);
    if (isNaN(n) || n === 0) return Alert.alert('Enter a non-zero number (negative to deduct)');
    if (bonusKidId) addBonus(bonusKidId, n, bonusNote.trim() || undefined);
    setShowBonusModal(false);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.titleRow}>
        <Text style={s.screenTitle}>Kids</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={state.kids}
        keyExtractor={k => k.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={<Text style={s.empty}>No kids yet. Tap "+ Add" to add a child.</Text>}
        renderItem={({ item }) => {
          const balance = getBalance(item.id);
          const assignedChores = state.chores.filter(c =>
            'kid' in c.assignment && c.assignment.kidId === item.id
          ).length;
          return (
            <View style={s.card}>
              <View style={[s.avatar, { backgroundColor: item.avatarColor }]}>
                <Text style={s.avatarText}>{item.name[0].toUpperCase()}</Text>
              </View>
              <View style={s.cardBody}>
                <Text style={s.kidName}>{item.name}</Text>
                <Text style={s.kidMeta}>⭐ {balance} stars · {assignedChores} chore{assignedChores !== 1 ? 's' : ''}</Text>
              </View>
              <View style={s.cardActions}>
                <TouchableOpacity style={s.actionBtn} onPress={() => openBonus(item.id)}>
                  <Text style={s.actionBtnText}>+ Bonus</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(item.id)}>
                  <Text style={s.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                  <Text style={[s.actionBtnText, { color: COLORS.danger }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Add / Edit Kid Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={s.form}>
              <View style={s.formHeader}>
                <Text style={s.formTitle}>{editingId ? 'Edit Kid' : 'Add Kid'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={s.formClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Name</Text>
              <TextInput
                style={s.input}
                value={form.name}
                onChangeText={t => setForm(f => ({ ...f, name: t }))}
                placeholder="e.g. Emma"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={s.label}>4-digit PIN</Text>
              <TextInput
                style={s.input}
                value={form.pin}
                onChangeText={t => setForm(f => ({ ...f, pin: t.replace(/\D/g, '').slice(0, 4) }))}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                placeholder="1234"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={s.label}>Avatar colour</Text>
              <View style={s.colorPicker}>
                {AVATAR_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[s.colorSwatch, { backgroundColor: c }, form.color === c && s.colorSwatchSelected]}
                    onPress={() => setForm(f => ({ ...f, color: c }))}
                  />
                ))}
              </View>

              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Bonus Stars Modal */}
      <Modal visible={showBonusModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={s.form}>
              <View style={s.formHeader}>
                <Text style={s.formTitle}>Bonus Stars</Text>
                <TouchableOpacity onPress={() => setShowBonusModal(false)}>
                  <Text style={s.formClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.label}>Stars (negative to deduct)</Text>
              <TextInput
                style={s.input}
                value={bonusStars}
                onChangeText={setBonusStars}
                keyboardType="numbers-and-punctuation"
                placeholder="5"
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={s.label}>Note (optional)</Text>
              <TextInput
                style={s.input}
                value={bonusNote}
                onChangeText={setBonusNote}
                placeholder="e.g. Helping without being asked"
                placeholderTextColor={COLORS.textSecondary}
              />
              <TouchableOpacity style={s.saveBtn} onPress={handleBonus}>
                <Text style={s.saveBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
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
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60, fontSize: 15 },
  card: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  cardBody: { flex: 1 },
  kidName: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary },
  kidMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: { backgroundColor: COLORS.bg, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  actionBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  form: { paddingHorizontal: 20, paddingBottom: 40, gap: 4 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  formTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  formClose: { fontSize: 20, color: COLORS.textSecondary, padding: 4 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 14, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: COLORS.textPrimary },
  colorPicker: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 6 },
  colorSwatch: { width: 40, height: 40, borderRadius: 20 },
  colorSwatchSelected: { borderWidth: 3, borderColor: COLORS.textPrimary },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
