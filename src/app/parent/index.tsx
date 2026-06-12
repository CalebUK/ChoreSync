import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal,
  TextInput, Switch, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  useStore, COLORS, URGENCY_COLORS, todayStr, getOccurrenceDate, getUrgency,
} from '@/store';
import type { Chore, RepeatRule, LatePolicy, Assignment } from '@/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ChoreForm {
  title: string;
  stars: string;
  assignType: 'kid' | 'free';
  kidId: string;
  repeatType: 'once' | 'daily' | 'weekly';
  date: string;
  weekday: number;
  startDate: string;
  latePolicy: LatePolicy;
  requiresApproval: boolean;
  requiresPhoto: boolean;
}

const emptyForm = (firstKidId: string): ChoreForm => ({
  title: '',
  stars: '3',
  assignType: 'kid',
  kidId: firstKidId,
  repeatType: 'once',
  date: todayStr(),
  weekday: new Date().getDay(),
  startDate: todayStr(),
  latePolicy: 'full',
  requiresApproval: false,
  requiresPhoto: false,
});

export default function ParentChoresScreen() {
  const { state, addChore, updateChore, deleteChore, setRole } = useStore();
  const today = todayStr();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ChoreForm>(emptyForm(state.kids[0]?.id ?? ''));

  function openAdd() {
    setEditing(null);
    setForm(emptyForm(state.kids[0]?.id ?? ''));
    setShowModal(true);
  }

  function openEdit(chore: Chore) {
    setEditing(chore.id);
    const assignment = chore.assignment;
    const rule = chore.repeatRule;
    setForm({
      title: chore.title,
      stars: String(chore.stars),
      assignType: 'free' in assignment ? 'free' : 'kid',
      kidId: 'kid' in assignment ? assignment.kidId : state.kids[0]?.id ?? '',
      repeatType: 'once' in rule ? 'once' : 'daily' in rule ? 'daily' : 'weekly',
      date: 'once' in rule ? rule.date : todayStr(),
      weekday: 'weekly' in rule ? rule.weekday : new Date().getDay(),
      startDate: 'daily' in rule ? rule.startDate : 'weekly' in rule ? rule.startDate : todayStr(),
      latePolicy: chore.latePolicy,
      requiresApproval: chore.requiresApproval,
      requiresPhoto: chore.requiresPhoto,
    });
    setShowModal(true);
  }

  function buildRepeatRule(): RepeatRule {
    if (form.repeatType === 'once') return { once: true, date: form.date || todayStr() };
    if (form.repeatType === 'daily') return { daily: true, startDate: form.startDate };
    return { weekly: true, startDate: form.startDate, weekday: form.weekday };
  }

  function buildAssignment(): Assignment {
    if (form.assignType === 'free') return { free: true };
    return { kid: true, kidId: form.kidId };
  }

  function handleSave() {
    if (!form.title.trim()) return Alert.alert('Title required');
    const stars = parseInt(form.stars, 10);
    if (isNaN(stars) || stars < 1) return Alert.alert('Stars must be a positive number');

    const data: Omit<Chore, 'id' | 'familyId'> = {
      title: form.title.trim(),
      stars,
      repeatRule: buildRepeatRule(),
      latePolicy: form.latePolicy,
      assignment: buildAssignment(),
      requiresPhoto: form.requiresPhoto,
      requiresApproval: form.requiresApproval,
    };

    if (editing) {
      updateChore(editing, data);
    } else {
      addChore(data);
    }
    setShowModal(false);
  }

  function handleDelete(id: string) {
    Alert.alert('Delete chore?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteChore(id) },
    ]);
  }

  function getKidName(chore: Chore): string {
    const a = chore.assignment;
    if ('free' in a) return 'Anyone';
    if ('everyone' in a) return 'Everyone';
    if ('kid' in a) return state.kids.find(k => k.id === a.kidId)?.name ?? '?';
    return '?';
  }

  function renderChore({ item }: { item: Chore }) {
    const occDate = getOccurrenceDate(item.repeatRule, today);
    const urgency = getUrgency(occDate, today);
    const kidName = getKidName(item);
    const repeatLabel =
      'once' in item.repeatRule ? `Once · ${item.repeatRule.date}` :
      'daily' in item.repeatRule ? 'Daily' :
      `Weekly · ${WEEKDAYS[item.repeatRule.weekday]}`;

    return (
      <TouchableOpacity style={s.choreCard} onPress={() => openEdit(item)} activeOpacity={0.8}>
        <View style={[s.urgencyBar, { backgroundColor: URGENCY_COLORS[urgency] }]} />
        <View style={s.choreBody}>
          <View style={s.choreRow}>
            <Text style={s.choreTitle}>{item.title}</Text>
            <Text style={s.choreStars}>⭐ {item.stars}</Text>
          </View>
          <View style={s.choreRow}>
            <Text style={s.choreMeta}>{kidName} · {repeatLabel}</Text>
            <Text style={[s.choreDue, { color: URGENCY_COLORS[urgency] }]}>{occDate}</Text>
          </View>
          <View style={s.badges}>
            {item.requiresApproval && <Text style={s.badge}>Needs approval</Text>}
            {item.requiresPhoto && <Text style={s.badge}>📷 Photo</Text>}
          </View>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={s.deleteBtn}>
          <Text style={s.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.titleRow}>
        <Text style={s.screenTitle}>Chores</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.addBtn} onPress={openAdd}>
            <Text style={s.addBtnText}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setRole(null); router.replace('/'); }} style={s.exitBtn}>
            <Text style={s.exitBtnText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={state.chores}
        keyExtractor={c => c.id}
        renderItem={renderChore}
        contentContainerStyle={s.list}
        ListEmptyComponent={<Text style={s.empty}>No chores yet. Tap "+ Add" to create one.</Text>}
      />

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={s.form}>
              <View style={s.formHeader}>
                <Text style={s.formTitle}>{editing ? 'Edit Chore' : 'New Chore'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={s.formClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Title</Text>
              <TextInput
                style={s.input}
                value={form.title}
                onChangeText={t => setForm(f => ({ ...f, title: t }))}
                placeholder="e.g. Wash dishes"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={s.label}>Stars</Text>
              <TextInput
                style={s.input}
                value={form.stars}
                onChangeText={t => setForm(f => ({ ...f, stars: t }))}
                keyboardType="numeric"
                placeholder="3"
                placeholderTextColor={COLORS.textSecondary}
              />

              <Text style={s.label}>Assign to</Text>
              <View style={s.segmented}>
                {(['kid', 'free'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.seg, form.assignType === t && s.segActive]}
                    onPress={() => setForm(f => ({ ...f, assignType: t }))}
                  >
                    <Text style={[s.segText, form.assignType === t && s.segTextActive]}>
                      {t === 'kid' ? 'Specific kid' : 'Free-for-all'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {form.assignType === 'kid' && state.kids.length > 0 && (
                <View style={s.kidPicker}>
                  {state.kids.map(k => (
                    <TouchableOpacity
                      key={k.id}
                      style={[s.kidChip, form.kidId === k.id && { borderColor: k.avatarColor, backgroundColor: k.avatarColor + '22' }]}
                      onPress={() => setForm(f => ({ ...f, kidId: k.id }))}
                    >
                      <Text style={s.kidChipText}>{k.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {form.assignType === 'kid' && state.kids.length === 0 && (
                <Text style={s.note}>Add kids first (Kids tab).</Text>
              )}

              <Text style={s.label}>Repeat</Text>
              <View style={s.segmented}>
                {(['once', 'daily', 'weekly'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.seg, form.repeatType === t && s.segActive]}
                    onPress={() => setForm(f => ({ ...f, repeatType: t }))}
                  >
                    <Text style={[s.segText, form.repeatType === t && s.segTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {form.repeatType === 'once' && (
                <>
                  <Text style={s.label}>Due date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={s.input}
                    value={form.date}
                    onChangeText={t => setForm(f => ({ ...f, date: t }))}
                    placeholder="2026-06-15"
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </>
              )}

              {form.repeatType !== 'once' && (
                <>
                  <Text style={s.label}>Start date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={s.input}
                    value={form.startDate}
                    onChangeText={t => setForm(f => ({ ...f, startDate: t }))}
                    placeholder={todayStr()}
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </>
              )}

              {form.repeatType === 'weekly' && (
                <>
                  <Text style={s.label}>Day of week</Text>
                  <View style={s.weekdays}>
                    {WEEKDAYS.map((d, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[s.dayBtn, form.weekday === i && s.dayBtnActive]}
                        onPress={() => setForm(f => ({ ...f, weekday: i }))}
                      >
                        <Text style={[s.dayBtnText, form.weekday === i && s.dayBtnTextActive]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={s.label}>Late stars</Text>
              <View style={s.segmented}>
                {(['full', 'half', 'none'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.seg, form.latePolicy === t && s.segActive]}
                    onPress={() => setForm(f => ({ ...f, latePolicy: t }))}
                  >
                    <Text style={[s.segText, form.latePolicy === t && s.segTextActive]}>
                      {t === 'full' ? 'Full' : t === 'half' ? 'Half' : 'None'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>Requires approval</Text>
                <Switch
                  value={form.requiresApproval}
                  onValueChange={v => setForm(f => ({ ...f, requiresApproval: v }))}
                  trackColor={{ true: COLORS.primary }}
                />
              </View>

              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>Requires photo</Text>
                <Switch
                  value={form.requiresPhoto}
                  onValueChange={v => setForm(f => ({ ...f, requiresPhoto: v }))}
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
  exitBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  exitBtnText: { color: COLORS.textSecondary, fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60, fontSize: 15 },
  choreCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, overflow: 'hidden', elevation: 1 },
  urgencyBar: { width: 5 },
  choreBody: { flex: 1, padding: 12, gap: 4 },
  choreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  choreTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  choreStars: { fontSize: 14, color: COLORS.star, fontWeight: '600' },
  choreMeta: { fontSize: 12, color: COLORS.textSecondary },
  choreDue: { fontSize: 12, fontWeight: '600' },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  badge: { backgroundColor: COLORS.bg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, fontSize: 11, color: COLORS.textSecondary },
  deleteBtn: { padding: 12, justifyContent: 'center' },
  deleteBtnText: { color: COLORS.danger, fontSize: 16 },
  // Form
  form: { paddingHorizontal: 20, paddingBottom: 40, gap: 4 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  formTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  formClose: { fontSize: 20, color: COLORS.textSecondary, padding: 4 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 14, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: COLORS.textPrimary },
  segmented: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  seg: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segActive: { backgroundColor: COLORS.primary },
  segText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  segTextActive: { color: '#fff', fontWeight: '700' },
  kidPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  kidChip: { borderRadius: 20, borderWidth: 2, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 8 },
  kidChipText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  weekdays: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayBtn: { borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: COLORS.surface },
  dayBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  dayBtnTextActive: { color: '#fff', fontWeight: '700' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  toggleLabel: { fontSize: 16, color: COLORS.textPrimary },
  note: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
