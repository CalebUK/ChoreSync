import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, todayStr } from '@/store';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

interface Props { selected: string; onSelect: (d: string) => void }

export default function Calendar({ selected, onSelect }: Props) {
  const parts = selected.split('-').map(Number);
  const [vy, setVy] = useState(parts[0]);
  const [vm, setVm] = useState(parts[1] - 1);
  const today = todayStr();
  const [ty, tm, td] = today.split('-').map(Number);

  function prevMonth() { vm === 0 ? (setVm(11), setVy(y => y - 1)) : setVm(m => m - 1); }
  function nextMonth() { vm === 11 ? (setVm(0), setVy(y => y + 1)) : setVm(m => m + 1); }

  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const rawFirst = new Date(vy, vm, 1).getDay();
  const offset = (rawFirst + 6) % 7; // 0 = Mon
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const [sy, sm, sd] = selected.split('-').map(Number);

  function selectDay(day: number) {
    const m = String(vm + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onSelect(`${vy}-${m}-${d}`);
  }

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <TouchableOpacity onPress={prevMonth} style={s.nav}><Text style={s.navText}>‹</Text></TouchableOpacity>
        <Text style={s.month}>{MONTH_NAMES[vm]} {vy}</Text>
        <TouchableOpacity onPress={nextMonth} style={s.nav}><Text style={s.navText}>›</Text></TouchableOpacity>
      </View>
      <View style={s.weekRow}>
        {DAY_LABELS.map(d => <Text key={d} style={s.weekLabel}>{d}</Text>)}
      </View>
      <View style={s.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={i} style={s.cell} />;
          const isSel = day === sd && vm + 1 === sm && vy === sy;
          const isToday = day === td && vm + 1 === tm && vy === ty;
          return (
            <TouchableOpacity key={i} style={s.cell} onPress={() => selectDay(day)} activeOpacity={0.7}>
              <View style={[s.circle, isSel && s.selCircle, isToday && !isSel && s.todayCircle]}>
                <Text style={[s.dayText, isSel && s.selText, isToday && !isSel && s.todayText]}>{day}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  nav: { padding: 8 },
  navText: { fontSize: 22, color: COLORS.textPrimary, fontWeight: '300' },
  month: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  selCircle: { backgroundColor: COLORS.primary },
  todayCircle: { borderWidth: 1.5, borderColor: COLORS.primary },
  dayText: { fontSize: 14, color: COLORS.textPrimary },
  selText: { color: '#fff', fontWeight: '700' },
  todayText: { color: COLORS.primary, fontWeight: '600' },
});
