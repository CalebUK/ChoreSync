import { Stack } from 'expo-router';

export default function KidLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
      <Stack.Screen name="complete" />
      <Stack.Screen name="redeem" />
    </Stack>
  );
}
