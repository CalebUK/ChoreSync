import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider } from '@/store';

const DARK_BG = '#121212';

function AppStack() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: DARK_BG } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="parent" />
      <Stack.Screen name="kid" />
    </Stack>
  );
}

export default function RootLayout() {
  if (Platform.OS === 'web') {
    return (
      <StoreProvider>
        <StatusBar style="light" />
        {/* Phone shell — styled via .phone-shell class in +html.tsx */}
        <View
          style={{ width: 393, height: 852, borderRadius: 50, overflow: 'hidden', backgroundColor: DARK_BG }}
        >
          <AppStack />
        </View>
      </StoreProvider>
    );
  }

  return (
    <StoreProvider>
      <StatusBar style="light" />
      <AppStack />
    </StoreProvider>
  );
}
