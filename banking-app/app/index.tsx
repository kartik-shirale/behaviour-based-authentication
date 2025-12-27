import { useUserStore } from '@/stores/useUserStore';
import { secureStorage } from '@/utils/secureStorage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

export default function Index() {
  const { isAuthenticated, initializeStore, checkLocalStorageAuth, user } = useUserStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await initializeStore();

      // Check if user has stored credentials for quick login
      const hasStoredCredentials = await checkLocalStorageAuth();

      setIsInitialized(true);
    };
    initialize();
  }, [initializeStore, checkLocalStorageAuth]);

  useEffect(() => {
    if (!isInitialized) return;

    // New authentication flow logic
    if (isAuthenticated) {
      // User is fully authenticated, go to dashboard
      router.replace('/(app)/dashboard');
    } else {
      // Check if user has stored credentials (PIN/Biometric setup)
      checkStoredCredentials();
    }
  }, [isAuthenticated, isInitialized]);

  const checkStoredCredentials = async () => {
    try {
      const storedUserId = await secureStorage.getItem('userId');
      const storedPin = await secureStorage.getItem('userPin');
      const biometricEnabled = await secureStorage.getItem('biometricEnabled');

      if (storedUserId && storedPin) {
        // User has completed setup before, show login screen
        router.replace('/(auth)/pin-auth');
      } else {
        // New user or incomplete setup, start onboarding flow from get-started
        router.replace('/(onboarding)/get-started');
      }
    } catch (error) {
      // Error checking stored credentials
      // Default to onboarding flow from get-started
      router.replace('/(onboarding)/get-started');
    }
  };

  return null; // This component just handles routing
}