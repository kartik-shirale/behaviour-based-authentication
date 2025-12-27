import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function AppLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="transactions" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="send-money" />
        <Stack.Screen name="request-money" />
        <Stack.Screen name="more-services" />
        <Stack.Screen name="transaction-details" />
      </Stack>
    </>
  );
}