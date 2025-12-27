import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useDataCollectionStore } from '../../stores/useDataCollectionStore';
import { useUserStore } from '../../stores/useUserStore';

export default function AuthLayout() {
  const { startDataCollection, startSession } = useDataCollectionStore();
  const { user } = useUserStore();

  // Initialize data collection for login scenario when auth layout mounts
  useEffect(() => {
    if (user?.uid) {
      try {
        startSession(user.uid);
        startDataCollection('login');
        console.log('🔍 Auth Layout - Started data collection for login scenario');
      } catch (dataCollectionError) {
        console.log('❌ Auth Layout - Failed to start data collection:', dataCollectionError);
        // Don't block auth flow if data collection fails
      }
    }
  }, [user?.uid]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="welcome" />
        <Stack.Screen name="pin-auth" />
      </Stack>
    </>
  );
}