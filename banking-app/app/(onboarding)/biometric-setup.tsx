import { BackButton } from '@/components/ui/BackButton';
import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import { Fingerprint, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, Text, View } from 'react-native';

// Import LocalAuthentication for native Android
let LocalAuthentication: any = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch (error) {
  // expo-local-authentication not available
}

type BiometricType = 'face' | 'fingerprint' | null;

interface BiometricOption {
  type: BiometricType;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  available: boolean;
}

export default function BiometricSetupScreen() {
  const { setupBiometric, isLoading, error, onboardingStep } = useUserStore();
  const [biometricOptions, setBiometricOptions] = useState<BiometricOption[]>([
    {
      type: 'face',
      title: 'Face ID',
      description: 'Use your face to unlock the app quickly and securely',
      icon: User,
      available: false,
    },
    {
      type: 'fingerprint',
      title: 'Fingerprint',
      description: 'Use your fingerprint to unlock the app quickly and securely',
      icon: Fingerprint,
      available: false,
    },
  ]);
  const [selectedType, setSelectedType] = useState<BiometricType>(null);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      if (!LocalAuthentication) {
        // LocalAuthentication not available on this platform
        return;
      }

      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      if (!isAvailable) {
        // Biometric hardware not available
        return;
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      setBiometricOptions(prev => prev.map(option => {
        if (option.type === 'face') {
          return {
            ...option,
            available: supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
          };
        }
        if (option.type === 'fingerprint') {
          return {
            ...option,
            available: supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
          };
        }
        return option;
      }));
    } catch (error) {
      // Error checking biometric availability
    }
  };

  const handleBiometricSetup = async (type: BiometricType) => {
    if (!type) return;

    if (!LocalAuthentication) {
      Alert.alert(
        'Not Available',
        'Biometric authentication is not available on this platform.',
        [{ text: 'Skip', onPress: () => handleSkipBiometric() }]
      );
      return;
    }

    try {
      // Check if biometric is enrolled
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(
          'Biometric Not Set Up',
          `Please set up ${type === 'face' ? 'Face ID' : 'fingerprint'} in your device settings first.`,
          [
            { text: 'Skip', onPress: () => handleSkipBiometric() },
            { text: 'OK' }
          ]
        );
        return;
      }

      // Test biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Set up ${type === 'face' ? 'Face ID' : 'fingerprint'} for BanKitka`,
        fallbackLabel: 'Use PIN instead',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        await setupBiometric(type);
        // Navigation will be handled by the store based on user setup status
      } else {
        Alert.alert(
          'Authentication Failed',
          'Biometric authentication failed. You can set this up later in settings.',
          [
            { text: 'Try Again', onPress: () => handleBiometricSetup(type) },
            { text: 'Skip', onPress: () => handleSkipBiometric() }
          ]
        );
      }
    } catch (error) {
      // Biometric setup error
      Alert.alert('Error', 'Failed to set up biometric authentication.');
    }
  };

  const handleSkipBiometric = async () => {
    try {
      router.push('/(onboarding)/security-questions');
    } catch (error) {
      Alert.alert('Error', 'Failed to navigate to security questions.');
    }
  };

  // Navigate based on onboarding step changes
  useEffect(() => {
    if (onboardingStep === 'completed') {
      router.replace('/(app)/dashboard');
    }
  }, [onboardingStep]);

  const availableOptions = biometricOptions.filter(option => option.available);
  const hasAvailableOptions = availableOptions.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <View className="flex-1 max-w-md mx-auto w-full">
        <View className="flex-1 px-6 py-12">
          {/* Header */}
          <View className="mb-20">
            <BackButton className="mb-16" />

            <Text className="text-xl font-semibold text-white mb-3 text-center">
              Add a layer of security
            </Text>
            <Text className="text-white/50 text-sm leading-5 text-center px-8">
              Use face or touch scanning for enhanced security and faster verification process to protect your account
            </Text>
          </View>

          {/* Biometric Options */}
          <View className="flex-1 mb-12">
            <View className="flex-row gap-4">
              {biometricOptions.map((option) => (
                <Pressable
                  key={option.type}
                  onPress={() => {
                    setSelectedType(option.type);
                    handleBiometricSetup(option.type);
                  }}
                  className={`flex-1 bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/30 ${selectedType === option.type ? 'bg-zinc-700/50' : 'bg-zinc-800/50'
                    } ${!option.available ? 'opacity-50' : ''}`}
                  disabled={isLoading || !option.available}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <View className="flex-col items-center text-center">
                    <View className="w-12 h-12 bg-white/10 rounded-lg items-center justify-center mb-3">
                      <option.icon size={24} color="white" />
                    </View>
                    <View>
                      <Text className="text-white text-center text-sm font-medium mb-1">
                        {option.title}
                      </Text>
                      <Text className="text-white/50 text-xs text-center leading-4">
                        {option.type === 'face' ? 'Quick & secure' : 'Touch to unlock'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>



          {/* Action Buttons */}
          <View className="mt-auto">
            <Pressable
              onPress={handleSkipBiometric}
              disabled={isLoading}
              className="w-full bg-white/90 rounded-xl py-3.5 px-6"
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text className="text-center text-base font-medium text-black">
                {isLoading ? 'Setting up...' : 'Setup Biometric'}
              </Text>
            </Pressable>

            <Text className="text-white/30 text-xs text-center mt-4">
              You can set this later in settings
            </Text>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}