import { router } from 'expo-router';
import { Delete, Fingerprint, ShieldUser } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, SafeAreaView, Text, Vibration, View } from 'react-native';
import { pinAttemptService } from '../../services/pinAttemptService';
import { useDataCollectionStore } from '../../stores/useDataCollectionStore';
import { useUserStore } from '../../stores/useUserStore';

// Import LocalAuthentication for native Android
let LocalAuthentication: any = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch (error) {
  // expo-local-authentication not available
}

export default function PinAuthScreen() {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { loginWithPin, loginWithBiometric, user } = useUserStore();
  const { startDataCollection, startSession, collectionScenario } = useDataCollectionStore();

  // Initialize biometricAvailable - always false for re-registration to prevent glitch
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [remainingAttempts, setRemainingAttempts] = useState(3);

  // Animation refs for PIN dots
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const [authSuccess, setAuthSuccess] = useState(false);

  // Animation functions
  const startBounceAnimation = () => {
    setIsAuthenticating(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopBounceAnimation = (success: boolean = false) => {
    bounceAnim.stopAnimation();
    setIsAuthenticating(false);
    setAuthSuccess(success);

    if (success) {
      // Reset animation value and show success state briefly
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset animation value
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  useEffect(() => {
    checkBiometricAvailability();
    checkPinAttemptStatus();
  }, [collectionScenario, user?.biometricEnabled]);

  // Debug logging for collection scenario changes
  useEffect(() => {
    console.log('🔍 PIN Auth - Collection Scenario:', collectionScenario);
    console.log('🔍 PIN Auth - Biometric Available:', biometricAvailable);
  }, [collectionScenario, biometricAvailable]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isBlocked && remainingTime > 0) {
      interval = setInterval(async () => {
        const status = await pinAttemptService.isBlocked();
        if (!status.blocked) {
          setIsBlocked(false);
          setRemainingTime(0);
          await updateRemainingAttempts();
        } else {
          setRemainingTime(status.remainingTime || 0);
        }
      }, 60000); // Check every minute
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBlocked, remainingTime]);

  const checkPinAttemptStatus = async () => {
    const status = await pinAttemptService.isBlocked();
    setIsBlocked(status.blocked);
    setRemainingTime(status.remainingTime || 0);
    await updateRemainingAttempts();
  };

  const updateRemainingAttempts = async () => {
    const attempts = await pinAttemptService.getRemainingAttempts();
    setRemainingAttempts(attempts);
  };

  const checkBiometricAvailability = async () => {
    console.log('🔍 Checking biometric availability - Scenario:', collectionScenario);

    // Always disable biometric during re-registration phase - no exceptions
    if (collectionScenario === 're-registration') {
      console.log('🚫 Biometric disabled for re-registration scenario');
      setBiometricAvailable(false);
      return;
    }

    if (!LocalAuthentication) {
      console.log('🚫 LocalAuthentication not available');
      setBiometricAvailable(false);
      return;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const biometricEnabled = user?.biometricEnabled;
      const shouldEnable = hasHardware && isEnrolled && biometricEnabled;

      console.log('🔍 Biometric check - Hardware:', hasHardware, 'Enrolled:', isEnrolled, 'User enabled:', biometricEnabled, 'Final:', shouldEnable);
      setBiometricAvailable(shouldEnable);
    } catch (error) {
      console.log('❌ Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const handleForgotPin = () => {
    Alert.alert(
      'Forgot PIN?',
      'You will need to verify your identity with OTP to reset your PIN.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset PIN',
          onPress: () => router.replace('../(onboarding)/mobile-input')
        }
      ]
    );
  };

  const handleBiometricAuth = async () => {
    try {
      setIsLoading(true);
      startBounceAnimation();
      const success = await loginWithBiometric();

      if (success && user) {
        // Stop animation and show success
        stopBounceAnimation(true);

        // Brief delay to show success state
        setTimeout(() => {
          // Data collection already started in auth layout

          router.replace('../(app)/dashboard');
        }, 800);
      } else {
        stopBounceAnimation(false);
        Alert.alert('Authentication Failed', 'Please try using your PIN instead.');
      }
    } catch (error) {
      stopBounceAnimation(false);
      Alert.alert('Authentication Error', 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = async (digit: string) => {
    // Check if PIN attempts are blocked
    const status = await pinAttemptService.isBlocked();
    if (status.blocked) {
      Alert.alert(
        'Too Many Attempts',
        `Please wait ${pinAttemptService.formatTimeRemaining(status.remainingTime || 0)} before trying again.`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (pin.length < 4) {
      // Reset success state when starting new PIN entry
      if (authSuccess) {
        setAuthSuccess(false);
      }

      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === 4) {
        startBounceAnimation();
        verifyPin(newPin);
      }
    }
  };

  const verifyPin = async (enteredPin: string) => {
    setIsLoading(true);

    try {
      const success = await loginWithPin(enteredPin);
      if (success && user) {
        // Stop animation and show success
        stopBounceAnimation(true);

        // Record successful attempt
        await pinAttemptService.recordSuccessfulAttempt();
        await updateRemainingAttempts();

        // Brief delay to show success state
        setTimeout(async () => {
          // Check if this is a re-registration scenario
          if (collectionScenario === 're-registration') {
            // Navigate to captcha verification for additional behavioral data collection
            router.push('../(onboarding)/captcha-verification');

          } else {
            // Data collection already started in auth layout

            router.replace('../(app)/dashboard');
          }
        }, 800);
      } else {
        // Stop animation and show failure
        stopBounceAnimation(false);

        // Record failed attempt
        const attemptResult = await pinAttemptService.recordFailedAttempt();
        await updateRemainingAttempts();

        Vibration.vibrate(500);

        if (attemptResult.blocked) {
          setIsBlocked(true);
          setRemainingTime(attemptResult.remainingTime || 0);
          Alert.alert(
            'Too Many Failed Attempts',
            `You have exceeded the maximum number of PIN attempts. Please wait ${pinAttemptService.formatTimeRemaining(attemptResult.remainingTime || 0)} before trying again.`,
            [{ text: 'OK' }]
          );
        } else {
          const remaining = await pinAttemptService.getRemainingAttempts();
          Alert.alert(
            'Incorrect PIN',
            `Please try again. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          );
        }

        setPin('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify PIN. Please try again.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    // Reset success state when deleting PIN
    if (authSuccess) {
      setAuthSuccess(false);
    }
  };

  const renderPinDots = () => {
    const getDotColor = (index: number) => {
      if (authSuccess && pin.length > index) {
        return 'bg-green-500';
      } else if (pin.length > index) {
        return 'bg-green-400';
      } else {
        return 'bg-zinc-700';
      }
    };

    return (
      <View className="flex-row justify-center items-center mb-12">
        {[0, 1, 2, 3].map((index) => (
          <Animated.View
            key={index}
            style={{
              transform: [{ scale: isAuthenticating ? bounceAnim : 1 }],
            }}
            className={`w-4 h-4 rounded-full mx-3 ${getDotColor(index)}`}
          />
        ))}
      </View>
    );
  };

  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['biometric', '0', 'delete'],
    ];

    return (
      <View className="flex-1 justify-center">
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row justify-center mb-4">
            {row.map((key, keyIndex) => {
              if (key === 'biometric') {
                // Explicitly disable biometric during re-registration - double check
                const shouldShowBiometric = biometricAvailable && !isBlocked && collectionScenario !== 're-registration';
                return shouldShowBiometric ? (
                  <Pressable
                    key={keyIndex}
                    onPress={handleBiometricAuth}
                    disabled={isLoading}
                    className="w-20 h-20 mx-4 rounded-full items-center justify-center bg-zinc-900/70 border border-zinc-800/50"
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Fingerprint size={24} color="#4ade80" />
                  </Pressable>
                ) : (
                  <View key={keyIndex} className="w-20 h-20 mx-4" />
                );
              }

              if (key === 'delete') {
                return (
                  <Pressable
                    key={keyIndex}
                    onPress={handleDelete}
                    disabled={pin.length === 0 || isBlocked}
                    className="w-20 h-20 mx-4 items-center justify-center"
                  >
                    <Delete size={24} color={pin.length === 0 || isBlocked ? '#71717a' : 'white'} />
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={keyIndex}
                  onPress={() => handlePinInput(key)}
                  disabled={isLoading || isBlocked}
                  className={`w-20 h-20 mx-4 rounded-full items-center justify-center ${isBlocked ? 'bg-zinc-700' : 'bg-zinc-900/70 border border-zinc-800/50'
                    }`}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text className={`text-2xl font-medium ${isBlocked ? 'text-zinc-500' : 'text-white'
                    }`}>{key}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <View className="flex-1 px-6 py-8">
        {/* Header */}
        <View className="items-center mb-12 mt-8">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-6 bg-[#10B981]"
          >
            <ShieldUser size={32} color="white" />
          </View>
          {user?.fullName && (
            <Text className="text-white text-3xl font-bold mb-2">
              Hi, {user.fullName.split(' ')[0]}!
            </Text>
          )}
          {isBlocked ? (
            <View className="items-center">
              <Text className="text-red-400 text-base text-center mb-2">
                Too many failed attempts
              </Text>
              <Text className="text-zinc-400 text-sm text-center">
                Please wait {pinAttemptService.formatTimeRemaining(remainingTime)} before trying again
              </Text>
            </View>
          ) : (
            <View className="items-center">
              <Text className="text-zinc-400 text-base text-center">
                Enter your 4-digit PIN to access your account
              </Text>
              {remainingAttempts < 3 && (
                <Text className="text-yellow-400 text-sm text-center mt-2">
                  {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                </Text>
              )}
            </View>
          )}
          {/* {user?.fullName && (
            <Text className="text-gray-300 text-sm mt-2 font-medium">
              Hi, {user.fullName.split(' ')[0]}!
            </Text>
          )} */}
        </View>

        {renderPinDots()}
        {renderKeypad()}



        {/* Forgot PIN */}
        <View className="items-center mt-6">
          <Pressable
            onPress={handleForgotPin}
            className="py-3 px-6"
          >
            <Text className="text-zinc-400 text-base font-medium underline">
              Forgot PIN?
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}