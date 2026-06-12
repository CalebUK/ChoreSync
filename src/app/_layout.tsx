import { Stack } from 'expo-router';
import { StoreProvider } from '@/store';

export default function RootLayout() {
  return (
    <StoreProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="parent" />
        <Stack.Screen name="kid" />
      </Stack>
    </StoreProvider>
  );
}
