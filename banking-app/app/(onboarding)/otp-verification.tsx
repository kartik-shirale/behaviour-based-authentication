import { useDataCollectionStore } from '@/stores/useDataCollectionStore';
import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import { useOtpVerify } from 'react-native-otp-verify';

import { AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, SafeAreaView, Text, View } from 'react-native';

export default function OtpVerificationScreen() {
  const { mobileNumber, verifyOTP, resendOTP, isLoading, onboardingStep, userExists } = useUserStore();
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasTriedVerification, setHasTriedVerification] = useState(false);

  // Use the new OTP verification hook
  const { otp: detectedOtp, timeoutError, stopListener, startListener } = useOtpVerify({
    numberOfDigits: 6
  });

  useEffect(() => {
    // Handle auto-detected OTP
    if (detectedOtp && detectedOtp.length === 6 && !isVerifying && !hasTriedVerification) {
      // Detected OTP
      setIsVerifying(true);
      setHasTriedVerification(true);
      // Auto-verify the detected OTP
      handleVerifyOtp(detectedOtp);
    }
  }, [detectedOtp, isVerifying, hasTriedVerification]);

  useEffect(() => {
    // Handle timeout errors
    if (timeoutError) {
      // OTP listener timeout, restarting
      startListener();
    }
  }, [timeoutError]);

  useEffect(() => {
    // Cleanup function
    return () => {
      stopListener();
    };
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);



  const handleVerifyOtp = async (otpCode: string) => {
    if (otpCode.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the complete 6-digit OTP.');
      setIsVerifying(false);
      return;
    }

    try {
      await verifyOTP(otpCode);

      // Now we know the user ID and type, update data collection accordingly
      const { setUserId, startDataCollection } = useDataCollectionStore.getState();
      const { user } = useUserStore.getState();

      // Set user ID for data collection
      if (user?.uid) {
        setUserId(user.uid);
      }

      // Update collection scenario based on user type
      if (userExists) {
        // User is re-registering - update scenario
        await startDataCollection('re-registration');
      } else {
        // User is new - update scenario from initial to first-time
        await startDataCollection('first-time-registration');
      }

      // Navigation will be handled by the store based on user setup status
    } catch (error) {
      setIsVerifying(false);
      Alert.alert('Verification Failed', 'Invalid OTP. Please wait for a new SMS.');
    }
  };

  // Navigate based on onboarding step changes
  useEffect(() => {
    if (onboardingStep === 'pin-setup') {
      router.push('/(onboarding)/pin-setup');
    } else if (onboardingStep === 'security-questions') {
      router.push('/(onboarding)/security-questions');
    } else if (onboardingStep === 'biometric-setup') {
      router.push('/(onboarding)/biometric-setup');
    } else if (onboardingStep === 'completed') {
      if (userExists) {
        // Re-registration scenario - redirect to PIN authentication
        router.replace('/(auth)/pin-auth');
      } else {
        // For first-time users, navigate to loading screen which will handle data submission
        router.push('./loading-setup');
      }
    }
  }, [onboardingStep, userExists]);

  const handleResendOtp = async () => {
    try {
      // Reset timer and verification state
      setTimer(30);
      setCanResend(false);
      setIsVerifying(false);
      setHasTriedVerification(false); // Reset verification attempt flag

      // Restart the OTP listener for new SMS
      startListener();

      // Resend OTP via backend API
      await resendOTP(mobileNumber);
      Alert.alert('OTP Sent', 'A new OTP has been sent to your mobile number.');
    } catch (error) {
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    }
  };



  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <KeyboardAvoidingView
        behavior='height'
        className="flex-1"
      >
        <View className="flex-1 px-8 py-8">
          {/* Header */}
          <View className="mb-16">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-zinc-800/50 items-center justify-center"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <ArrowLeft size={20} color="#a1a1aa" />
            </Pressable>

            <Text className="text-3xl font-bold text-zinc-100 mb-3">
              Verify OTP
            </Text>
            <Text className="text-zinc-400 text-lg leading-6">
              Enter the 6-digit code sent to{"\n"}
              <Text className="font-semibold text-zinc-200">
                {mobileNumber}
              </Text>
            </Text>
          </View>

          {/* OTP Status Section */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-zinc-200 text-sm font-semibold">
                {isVerifying ? 'OTP Detected' : 'Waiting for SMS'}
              </Text>
              <Text className="text-zinc-500 text-xs">
                6-digit code
              </Text>
            </View>

            {/* OTP Detection Status */}
            <View className="bg-zinc-900/50 rounded-2xl p-6 mb-6 border border-zinc-800/50">
              <View className="flex-row items-center justify-center mb-4">
                <View className={`w-4 h-4 rounded-full mr-3 ${isVerifying ? 'bg-green-400' : 'bg-yellow-400'
                  }`} />
                <Text className="text-zinc-100 text-lg font-semibold">
                  {isVerifying ? 'Verifying OTP...' : 'Listening for SMS'}
                </Text>
              </View>

              {detectedOtp && (
                <View className="bg-green-400/20 rounded-xl p-4 border border-green-400/30">
                  <Text className="text-green-400 text-center text-2xl font-bold tracking-widest">
                    {detectedOtp}
                  </Text>
                </View>
              )}

              {!detectedOtp && (
                <View className="flex-row justify-center gap-2">
                  {[...Array(6)].map((_, index) => (
                    <View
                      key={index}
                      className="w-12 h-12 border-2 border-zinc-700/50 rounded-xl bg-zinc-800/30 items-center justify-center"
                    >
                      <Text className="text-zinc-600 text-xl">•</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Timer and Resend */}
            <View className="flex-row justify-between items-center">
              <Text className="text-zinc-500 text-sm">
                {canResend ? "Didn't receive OTP?" : `Resend OTP in ${timer}s`}
              </Text>

              {canResend && (
                <Pressable onPress={handleResendOtp}>
                  <Text className="text-zinc-200 text-sm font-semibold">
                    Resend OTP
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Info Section */}
          <View className="bg-zinc-900/30 rounded-2xl p-5 mb-8 border border-zinc-800/30">
            <Text className="text-zinc-200 text-sm font-semibold mb-2">
              {isVerifying ? 'OTP Auto-Detected' : 'Automatic Detection'}
            </Text>
            <Text className="text-zinc-400 text-sm leading-5">
              {isVerifying
                ? 'OTP was automatically detected from your SMS. Verifying now...'
                : 'Your OTP will be automatically detected when the SMS arrives. No manual entry required.'}
            </Text>

            {timeoutError && (
              <View className="mt-3 p-3 bg-yellow-400/20 rounded-lg border border-yellow-400/30">
                <View className="flex-row items-center">
                  <AlertTriangle size={16} color="#facc15" style={{ marginRight: 8 }} />
                  <Text className="text-yellow-400 text-xs font-medium">
                    SMS detection timeout. Listening restarted automatically.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Status Display */}
          <View className="mt-auto">
            <View className="rounded-2xl py-4 px-6 bg-zinc-900/50 border border-zinc-800/50">
              <Text className="text-center text-lg font-semibold text-zinc-300">
                {isVerifying ? 'Verifying OTP...' : 'Waiting for SMS...'}
              </Text>
              {isLoading && (
                <Text className="text-center text-sm text-zinc-500 mt-2">
                  Please wait while we verify your OTP
                </Text>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
