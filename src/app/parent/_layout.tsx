import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/store';

function TabIcon({ icon, label, focused }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; focused: boolean }) {
  return (
    <View style={s.icon}>
      <Ionicons name={icon} size={22} color={focused ? COLORS.primary : COLORS.textSecondary} />
      <Text style={[s.label, { color: focused ? COLORS.primary : COLORS.textSecondary }]}>{label}</Text>
    </View>
  );
}

function AddIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[s.addCircle, focused && { backgroundColor: COLORS.primary }]}>
      <Text style={{ color: '#fff', fontSize: 26, lineHeight: 30, fontWeight: '300' }}>+</Text>
    </View>
  );
}

export default function ParentLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarShowLabel: false, tabBarStyle: s.tabBar }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="home-outline" label="Family" focused={focused} /> }} />
      <Tabs.Screen name="approvals" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="checkmark-circle-outline" label="Approvals" focused={focused} /> }} />
      <Tabs.Screen name="add" options={{ tabBarIcon: ({ focused }) => <AddIcon focused={focused} /> }} />
      <Tabs.Screen name="rewards" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="gift-outline" label="Rewards" focused={focused} /> }} />
      <Tabs.Screen name="edit-chore" options={{ href: null }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.card,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 12,
    paddingTop: 8,
  },
  icon: { alignItems: 'center', gap: 3 },
  label: { fontSize: 11, fontWeight: '500' },
  addCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.cardElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.borderLight,
    marginTop: -8,
  },
});
