import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Switch,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore, COLORS, todayStr } from '@/store';
import Calendar from '@/components/Calendar';
import type { RepeatRule, LatePolicy, Assignment } from '@/types';

const CHORE_ICONS: Array<React.ComponentProps<typeof Ionicons>['name']> = [
  'restaurant-outline', 'trash-outline', 'bed-outline', 'water-outline',
  'book-outline', 'basket-outline', 'leaf-outline', 'paw-outline',
  'fitness-outline', 'nutrition-outline', 'car-outline', 'home-outline',
  'flower-outline', 'bag-outline', 'construct-outline', 'fish-outline',
  'star-outline', 'bicycle-outline', 'cafe-outline', 'cart-outline',
  'shirt-outline', 'cut-outline', 'color-palette-outline', 'sunny-outline',
  'brush-outline', 'cube-outline', 'body-outline', 'camera-outline',
];

const WEEKDAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatShortDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return `${SHORT_MONTHS[m - 1]} ${day}, ${y}`;
}

interface Form {
  icon: string;
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

export default function EditChoreScreen() {
  const { choreId } = useLocalSearchParams<{ choreId: string }>();
  const { state, updateChore, deleteChore } = useStore();

  const chore = state.chores.find(c => c.id === choreId);

  const [form, setForm] = useState<Form>(() => {
    if (!chore) return {
      icon: '', title: '', assignType: 'kid', kidId: state.kids[0]?.id ?? '',
      repeatType: 'once', date: todayStr(), weekday: new Date().getDay(),
      startDate: todayStr(), stars: 10, latePolicy: 'full',
      requiresPhoto: false, requiresApproval: false,
    };
    const assignType: 'kid' | 'free' | 'everyone' =
      'kid' in chore.assignment ? 'kid' :
      'free' in chore.assignment ? 'free' : 'everyone';
    const kidId = 'kid' in chore.assignment ? chore.assignment.kidId : (state.kids[0]?.id ?? '');
    const repeatType: 'once' | 'daily' | 'weekly' =
      'once' in chore.repeatRule ? 'once' :
      'daily' in chore.repeatRule ? 'daily' : 'weekly';
    const date = 'once' in chore.repeatRule ? chore.repeatRule.date : todayStr();
    const startDate = 'daily' in chore.repeatRule ? chore.repeatRule.startDate :
      'weekly' in chore.repeatRule ? chore.repeatRule.startDate : todayStr();
    const weekday = 'weekly' in chore.repeatRule ? chore.repeatRule.weekday : new Date().getDay();
    return {
      icon: chore.icon ?? '',
      title: chore.title,
      assignType, kidId, repeatType, date, weekday, startDate,
      stars: chore.stars, latePolicy: chore.latePolicy,
      requiresPhoto: chore.requiresPhoto, requiresApproval: chore.requiresApproval,
    };
  });

  if (!chore) {
    router.back();
    return null;
  }

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

  function handleSave() {
    if (!form.title.trim()) return Alert.alert('Add a title first');
    if (form.assignType === 'kid' && !form.kidId) return Alert.alert('Pick a kid, or use Free/All');
    updateChore(chore!.id, {
      icon: form.icon || undefined,
      title: form.title.trim(),
      stars: form.stars,
      repeatRule: buildRule(),
      latePolicy: form.latePolicy,
      assignment: buildAssignment(),
      requiresPhoto: form.requiresPhoto,
      requiresApproval: form.requiresApproval,
    });
    router.back();
  }

  function handleDelete() {
    Alert.alert(`Delete "${chore!.title}"?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteChore(chore!.id); router.back(); } },
    ]);
  }

  const selectedDate = form.repeatType === 'once' ? form.date : form.startDate;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.navBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={s.navTitle}>Edit chore</Text>
          <TouchableOpacity onPress={handleDelete} style={s.navBtn}>
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardDismissMode="on-drag">
          {/* Icon picker */}
          <Text style={s.label}>Icon</Text>
          <View style={s.iconPreviewRow}>
            <View style={[s.iconPreview, form.icon ? { borderColor: COLORS.primary } : {}]}>
              <Ionicons
                name={(form.icon as React.ComponentProps<typeof Ionicons>['name']) || 'grid-outline'}
                size={26}
                color={form.icon ? COLORS.textPrimary : COLORS.textSecondary}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={s.iconGrid}>
                {CHORE_ICONS.map(name => (
                  <TouchableOpacity
                    key={name}
                    style={[s.iconCell, form.icon === name && s.iconCellActive]}
                    onPress={() => set('icon', form.icon === name ? '' : name)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={name} size={22} color={form.icon === name ? COLORS.primary : COLORS.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

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
                <TouchableOpacity key={t} style={[s.pill, active && s.pillActive]} onPress={() => set('assignType', t)}>
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

          {/* Due date */}
          <Text style={s.label}>Due date</Text>
          <Calendar
            selected={selectedDate}
            onSelect={d => form.repeatType === 'once' ? set('date', d) : set('startDate', d)}
          />

          {/* Repeat */}
          <View style={s.seg}>
            {(['once', 'daily', 'weekly'] as const).map(t => (
              <TouchableOpacity key={t} style={[s.segBtn, form.repeatType === t && s.segBtnActive]} onPress={() => set('repeatType', t)}>
                <Text style={[s.segText, form.repeatType === t && s.segTextActive]}>
                  {t === 'once' ? 'Once' : t === 'daily' ? 'Every day' : 'Every week'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.datePill}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
            <Text style={s.datePillText}>
              {form.repeatType === 'once' ? formatShortDate(form.date) :
               form.repeatType === 'daily' ? `Daily from ${formatShortDate(form.startDate)}` :
               `${WEEKDAY_LABELS[form.weekday]}s from ${formatShortDate(form.startDate)}`}
            </Text>
          </View>

          {form.repeatType === 'weekly' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillRow}>
              {WEEKDAY_LABELS.map((d, i) => (
                <TouchableOpacity key={i} style={[s.pill, form.weekday === i && s.pillActive]} onPress={() => set('weekday', i)}>
                  <Text style={[s.pillText, form.weekday === i && s.pillTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Stars */}
          <Text style={s.label}>Reward</Text>
          <View style={s.starPicker}>
            <TouchableOpacity style={s.starBtn} onPress={() => set('stars', Math.max(1, form.stars - 1))}>
              <Text style={s.starBtnText}>−</Text>
            </TouchableOpacity>
            <View style={s.starDisplay}>
              <Ionicons name="star" size={22} color={COLORS.star} />
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
              <TouchableOpacity key={t} style={[s.segBtn, form.latePolicy === t && s.segBtnActive]} onPress={() => set('latePolicy', t)}>
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

          <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
            <Text style={s.saveBtnText}>Save changes</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  navBtn: { padding: 6 },
  navTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 10, marginTop: 18 },
  titleInput: { fontSize: 18, color: COLORS.textPrimary, backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 4 },
  iconPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  iconPreview: { width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center' },
  iconGrid: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8, paddingVertical: 4 },
  iconCell: { width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  iconCellActive: { backgroundColor: COLORS.primaryDim, borderWidth: 1.5, borderColor: COLORS.primary },
  pillRow: { flexDirection: 'row', marginBottom: 8 },
  pill: { borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderLight, paddingHorizontal: 18, paddingVertical: 9, marginRight: 8, backgroundColor: COLORS.card },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '500' },
  pillTextActive: { color: '#fff', fontWeight: '700' },
  assignNote: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  seg: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, padding: 3, marginBottom: 10 },
  segBtn: { flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  segBtnActive: { backgroundColor: COLORS.primary },
  segText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  segTextActive: { color: '#fff', fontWeight: '700' },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18, marginTop: 6 },
  datePillText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  starPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  starBtn: { paddingHorizontal: 24, paddingVertical: 18 },
  starBtnText: { fontSize: 24, color: COLORS.textPrimary, fontWeight: '300' },
  starDisplay: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  starNum: { fontSize: 26, fontWeight: '700', color: COLORS.textPrimary },
  toggleCard: { backgroundColor: COLORS.card, borderRadius: 14, marginBottom: 24, overflow: 'hidden' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  toggleLabel: { fontSize: 16, fontWeight: '500', color: COLORS.textPrimary },
  toggleSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
