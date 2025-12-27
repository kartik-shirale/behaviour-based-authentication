import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';

import { TouchTrackingWrapper } from '@/components/TouchTrackingWrapper';
import { useColorScheme } from '@/hooks/useColorScheme';
import { nativeDataCollectionService } from '@/services/NativeDataCollectionService';
import { useDataCollectionStore } from '@/stores/useDataCollectionStore';
import './global.css';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    const initializeDataCollection = async () => {
      try {
        const initialized = await nativeDataCollectionService.initialize();
      } catch (error) {
        // Error initializing native data collection
      }
    };

    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Reinitialize if needed
        if (!nativeDataCollectionService.isServiceReady()) {
          await initializeDataCollection();
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Export data before going to background
        try {
          const exportedData = await nativeDataCollectionService.exportData();
        } catch (error) {
          // Failed to export data
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initialize data collection when app loads
    initializeDataCollection();

    return () => {
      subscription?.remove();
      // End both data collection sessions when app unmounts
      const endDataCollectionSession = async () => {
        try {
          // End useDataCollectionStore session and send data to server
          await useDataCollectionStore.getState().endSessionAndSendData('/api/data/regular');
        } catch (error) {
          // Failed to end data collection store session
        }

        // End native data collection service session
        try {
          nativeDataCollectionService.endSession();
        } catch (error) {
          // Failed to end native data collection service session
        }
      };

      endDataCollectionSession();
    };
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <TouchTrackingWrapper style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="light" />
      </TouchTrackingWrapper>
    </ThemeProvider>
  );
}
