import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/store';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={s.icon}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: s.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Family" focused={focused} /> }}
      />
      <Tabs.Screen
        name="approvals"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="✅" label="Approvals" focused={focused} /> }}
      />
      <Tabs.Screen
        name="add"
        options={{ tabBarIcon: ({ focused }) => <AddIcon focused={focused} /> }}
      />
      <Tabs.Screen
        name="rewards"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🎁" label="Rewards" focused={focused} /> }}
      />
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
