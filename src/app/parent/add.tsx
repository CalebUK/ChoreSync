import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Switch,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore, COLORS, todayStr, addDays } from '@/store';
import type { RepeatRule, LatePolicy, Assignment } from '@/types';

// ── Calendar ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

function Calendar({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const parts = selected.split('-').map(Number);
  const [vy, setVy] = useState(parts[0]);
  const [vm, setVm] = useState(parts[1] - 1); // 0-indexed
  const today = todayStr();
  const todayParts = today.split('-').map(Number);

  function prevMonth() { vm === 0 ? (setVm(11), setVy(y => y - 1)) : setVm(m => m - 1); }
  function nextMonth() { vm === 11 ? (setVm(0), setVy(y => y + 1)) : setVm(m => m + 1); }

  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const rawFirst = new Date(vy, vm, 1).getDay(); // 0=Sun
  const offset = (rawFirst + 6) % 7; // 0=Mon

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function selectDay(day: number) {
    const m = String(vm + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onSelect(`${vy}-${m}-${d}`);
  }

  const selParts = selected.split('-').map(Number);

  return (
    <View style={cal.wrap}>
      <View style={cal.header}>
        <TouchableOpacity onPress={prevMonth} style={cal.nav}><Text style={cal.navText}>‹</Text></TouchableOpacity>
        <Text style={cal.month}>{MONTH_NAMES[vm]} {vy}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.nav}><Text style={cal.navText}>›</Text></TouchableOpacity>
      </View>

      <View style={cal.weekRow}>
        {DAY_LABELS.map(d => <Text key={d} style={cal.weekLabel}>{d}</Text>)}
      </View>

      <View style={cal.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={cal.cell} />;
          const isToday = day === todayParts[2] && vm + 1 === todayParts[1] && vy === todayParts[0];
          const isSel = day === selParts[2] && vm + 1 === selParts[1] && vy === selParts[0];
          return (
            <TouchableOpacity key={i} style={cal.cell} onPress={() => selectDay(day)} activeOpacity={0.7}>
              <View style={[cal.dayCircle, isSel && cal.selCircle, isToday && !isSel && cal.todayCircle]}>
                <Text style={[cal.dayText, isSel && cal.selText, isToday && !isSel && cal.todayText]}>{day}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const cal = StyleSheet.create({
  wrap: { backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  nav: { padding: 8 },
  navText: { fontSize: 22, color: COLORS.textPrimary, fontWeight: '300' },
  month: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  selCircle: { backgroundColor: COLORS.primary },
  todayCircle: { borderWidth: 1.5, borderColor: COLORS.primary },
  dayText: { fontSize: 14, color: COLORS.textPrimary },
  selText: { color: '#fff', fontWeight: '700' },
  todayText: { color: COLORS.primary, fontWeight: '600' },
});

// ── Add Chore Screen ──────────────────────────────────────────────────────────

interface Form {
  title: string;
  assignType: 'kid' | 'free' | 'everyone';
  kidId: string;
  repeatType: 'once' | 'daily' | 'weekly';
  date: string;
  weekday: number;
  startDate: string;
  stars: number;
  latePolicy: LatePolicy;
  requiresPhoto: boolean;
  requiresApproval: boolean;
}

function freshForm(firstKidId: string): Form {
  return {
    title: '',
    assignType: 'kid',
    kidId: firstKidId,
    repeatType: 'once',
    date: todayStr(),
    weekday: new Date().getDay(),
    startDate: todayStr(),
    stars: 10,
    latePolicy: 'full',
    requiresPhoto: false,
    requiresApproval: false,
  };
}

function formatShortDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return `${SHORT_MONTHS[m - 1]} ${day}, ${y}`;
}

const WEEKDAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function AddChoreScreen() {
  const { state, addChore } = useStore();
  const [form, setForm] = useState<Form>(() => freshForm(state.kids[0]?.id ?? ''));

  function set<K extends keyof Form>(key: K, val: Form[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function buildRule(): RepeatRule {
    if (form.repeatType === 'once') return { once: true, date: form.date };
    if (form.repeatType === 'daily') return { daily: true, startDate: form.startDate };
    return { weekly: true, startDate: form.startDate, weekday: form.weekday };
  }

  function buildAssignment(): Assignment {
    if (form.assignType === 'free') return { free: true };
    if (form.assignType === 'everyone') return { everyone: true };
    return { kid: true, kidId: form.kidId };
  }

  function handleSave(andAnother = false) {
    if (!form.title.trim()) return Alert.alert('Add a title first');
    if (form.assignType === 'kid' && !form.kidId) return Alert.alert('Pick a kid, or use Free/All');
    addChore({
      title: form.title.trim(),
      stars: form.stars,
      repeatRule: buildRule(),
      latePolicy: form.latePolicy,
      assignment: buildAssignment(),
      requiresPhoto: form.requiresPhoto,
      requiresApproval: form.requiresApproval,
    });
    if (andAnother) {
      setForm(f => ({ ...freshForm(state.kids[0]?.id ?? ''), assignType: f.assignType, kidId: f.kidId }));
    } else {
      setForm(freshForm(state.kids[0]?.id ?? ''));
    }
    Alert.alert('Saved ✓', andAnother ? 'Add another!' : '');
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardDismissMode="on-drag">
          <Text style={s.screenTitle}>New chore</Text>

          {/* Title */}
          <TextInput
            style={s.titleInput}
            value={form.title}
            onChangeText={t => set('title', t)}
            placeholder="Chore name"
            placeholderTextColor={COLORS.textSecondary}
          />

          {/* Assign to */}
          <Text style={s.label}>Assign to</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillRow}>
            {state.kids.map(k => {
              const active = form.assignType === 'kid' && form.kidId === k.id;
              return (
                <TouchableOpacity
                  key={k.id}
                  style={[s.pill, active && s.pillActive]}
                  onPress={() => { set('assignType', 'kid'); set('kidId', k.id); }}
                >
                  <Text style={[s.pillText, active && s.pillTextActive]}>{k.name}</Text>
                </TouchableOpacity>
              );
            })}
            {(['free', 'everyone'] as const).map(t => {
              const active = form.assignType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[s.pill, active && s.pillActive]}
                  onPress={() => set('assignType', t)}
                >
                  <Text style={[s.pillText, active && s.pillTextActive]}>{t === 'free' ? 'Free' : 'All'}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {form.assignType === 'kid' && form.kidId && (
            <Text style={s.assignNote}>Assigned to {state.kids.find(k => k.id === form.kidId)?.name ?? ''}.</Text>
          )}
          {form.assignType === 'free' && <Text style={s.assignNote}>Free for all — first to complete wins.</Text>}
          {form.assignType === 'everyone' && <Text style={s.assignNote}>Every kid gets their own copy.</Text>}

          {/* Due date / Calendar */}
          <Text style={s.label}>Due date</Text>
          <Calendar
            selected={form.repeatType === 'once' ? form.date : form.startDate}
            onSelect={d => form.repeatType === 'once' ? set('date', d) : set('startDate', d)}
          />

          {/* Repeat */}
          <View style={s.seg}>
            {(['once', 'daily', 'weekly'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[s.segBtn, form.repeatType === t && s.segBtnActive]}
                onPress={() => set('repeatType', t)}
              >
                <Text style={[s.segText, form.repeatType === t && s.segTextActive]}>
                  {t === 'once' ? 'Once' : t === 'daily' ? 'Every day' : 'Every week'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Selected date display */}
          <View style={s.datePill}>
            <Text style={s.datePillIcon}>📅</Text>
            <Text style={s.datePillText}>
              {form.repeatType === 'once' ? formatShortDate(form.date) :
               form.repeatType === 'daily' ? `Daily from ${formatShortDate(form.startDate)}` :
               `${WEEKDAY_LABELS[form.weekday]}s from ${formatShortDate(form.startDate)}`}
            </Text>
          </View>

          {/* Weekly: weekday picker */}
          {form.repeatType === 'weekly' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillRow}>
              {WEEKDAY_LABELS.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.pill, form.weekday === i && s.pillActive]}
                  onPress={() => set('weekday', i)}
                >
                  <Text style={[s.pillText, form.weekday === i && s.pillTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Reward (stars) */}
          <Text style={s.label}>Reward</Text>
          <View style={s.starPicker}>
            <TouchableOpacity
              style={s.starBtn}
              onPress={() => set('stars', Math.max(1, form.stars - 1))}
            >
              <Text style={s.starBtnText}>−</Text>
            </TouchableOpacity>
            <View style={s.starDisplay}>
              <Text style={s.starIcon}>☆</Text>
              <Text style={s.starNum}>{form.stars}</Text>
            </View>
            <TouchableOpacity style={s.starBtn} onPress={() => set('stars', form.stars + 1)}>
              <Text style={s.starBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Late policy */}
          <Text style={s.label}>Stars if completed late</Text>
          <View style={s.seg}>
            {(['full', 'half', 'none'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[s.segBtn, form.latePolicy === t && s.segBtnActive]}
                onPress={() => set('latePolicy', t)}
              >
                <Text style={[s.segText, form.latePolicy === t && s.segTextActive]}>
                  {t === 'full' ? 'Full' : t === 'half' ? 'Half' : 'None'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Toggles */}
          <View style={s.toggleCard}>
            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>Require a photo</Text>
                <Text style={s.toggleSub}>Camera only, no gallery</Text>
              </View>
              <Switch
                value={form.requiresPhoto}
                onValueChange={v => set('requiresPhoto', v)}
                trackColor={{ true: COLORS.primary, false: COLORS.borderLight }}
                thumbColor="#fff"
              />
            </View>

            <View style={[s.toggleRow, { borderTopWidth: 1, borderTopColor: COLORS.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>Need my approval</Text>
                <Text style={s.toggleSub}>Stars awarded after I approve</Text>
              </View>
              <Switch
                value={form.requiresApproval}
                onValueChange={v => set('requiresApproval', v)}
                trackColor={{ true: COLORS.primary, false: COLORS.borderLight }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Save buttons */}
          <TouchableOpacity style={s.saveBtn} onPress={() => handleSave(false)}>
            <Text style={s.saveBtnText}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtnSecondary} onPress={() => handleSave(true)}>
            <Text style={s.saveBtnSecondaryText}>Create &amp; add another</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 48 },
  screenTitle: { fontSize: 26, fontWeight: '700', color: COLORS.textPrimary, paddingTop: 16, paddingBottom: 20 },
  titleInput: {
    fontSize: 18, color: COLORS.textPrimary, backgroundColor: COLORS.card,
    borderRadius: 14, padding: 16, marginBottom: 22,
  },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 10 },
  pillRow: { flexDirection: 'row', marginBottom: 8 },
  pill: { borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderLight, paddingHorizontal: 18, paddingVertical: 9, marginRight: 8, backgroundColor: COLORS.card },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '500' },
  pillTextActive: { color: '#fff', fontWeight: '700' },
  assignNote: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 18 },
  seg: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, padding: 3, marginBottom: 10 },
  segBtn: { flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  segBtnActive: { backgroundColor: COLORS.primary },
  segText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  segTextActive: { color: '#fff', fontWeight: '700' },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18, marginTop: 6 },
  datePillIcon: { fontSize: 14 },
  datePillText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  starPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, overflow: 'hidden', marginBottom: 22 },
  starBtn: { paddingHorizontal: 24, paddingVertical: 18 },
  starBtnText: { fontSize: 24, color: COLORS.textPrimary, fontWeight: '300' },
  starDisplay: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  starIcon: { fontSize: 22, color: COLORS.star },
  starNum: { fontSize: 26, fontWeight: '700', color: COLORS.textPrimary },
  toggleCard: { backgroundColor: COLORS.card, borderRadius: 14, marginBottom: 24, overflow: 'hidden' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  toggleLabel: { fontSize: 16, fontWeight: '500', color: COLORS.textPrimary },
  toggleSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  saveBtnSecondary: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnSecondaryText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '500' },
});
