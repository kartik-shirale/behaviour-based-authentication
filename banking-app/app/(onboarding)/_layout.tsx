import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function OnboardingLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false, // Prevent swipe back during onboarding
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="get-started" />
        <Stack.Screen name="permissions" />
        <Stack.Screen name="mobile-input" />
        <Stack.Screen name="otp-verification" />
        <Stack.Screen name="pin-setup" />
        <Stack.Screen name="biometric-setup" />
        <Stack.Screen name="security-questions" />
      </Stack>
    </>
  );
}