import DataCollectionTextInput from '@/components/DataCollectionTextInput';
import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, SafeAreaView, Text, View } from 'react-native';

export default function MobileInputScreen() {
  const { setMobileNumber, checkUserExists, isLoading, error, userExists, setError } = useUserStore();
  const [mobile, setMobile] = useState('');
  const [isValid, setIsValid] = useState(false);

  const validateMobileNumber = (number: string) => {
    // Indian mobile number validation (10 digits starting with 6-9)
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(number);
  };

  const handleMobileChange = (text: string) => {
    // Clear any existing error when user starts typing
    if (error) {
      setError(null);
    }

    // Remove any non-numeric characters and spaces from formatted input
    const numericText = text.replace(/[^0-9]/g, '');

    // Limit to 10 digits
    if (numericText.length <= 10) {
      setMobile(numericText);
      setIsValid(validateMobileNumber(numericText));
    }
  };

  const handleContinue = async () => {
    if (!isValid) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      // Format mobile number with country code for database lookup
      const formattedMobile = `+91${mobile}`;
      setMobileNumber(formattedMobile);

      // Check if user exists and send OTP in one step
      const userExists = await checkUserExists(formattedMobile);

      if (userExists) {
        // Navigate to OTP verification if user exists and OTP was sent
        router.push('/(onboarding)/otp-verification');
      }
      // Error message is already set by checkUserExists function if user doesn't exist
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to verify mobile number. Please check your number and try again.',
        [{ text: 'OK' }]
      );
    }
  };



  return (

    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        behavior='height'
        className="flex-1"
      >
        <View className="flex-1 px-8 py-8">
          {/* Header */}
          <View className="mb-16 flex-col gap-3 items-start justify-">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-zinc-800/50 items-center justify-center"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <ArrowLeft size={20} color="#a1a1aa" />
            </Pressable>

            <View>
              <Text className="text-2xl font-bold text-white mb-3">
                Enter Mobile Number
              </Text>
              <Text className="text-white/70 text-sm leading-6">
                We'll send you an OTP to verify your number
              </Text>
            </View>
          </View>

          {/* Mobile Input Section */}
          <View className="mb-8">
            <Text className="text-white text-sm font-semibold mb-3">
              Mobile Number
            </Text>

            <View className="flex-row items-center bg-white/5 border border-white/20 rounded-2xl px-5 py-4">
              <Text className="text-white text-lg mr-3">🇮🇳 +91</Text>
              <DataCollectionTextInput
                value={mobile}
                onChangeText={handleMobileChange}
                placeholder="Enter your mobile number"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                keyboardType="numeric"
                maxLength={10}
                className="flex-1 text-lg text-white"
                autoFocus
                inputType="mobile"
              />
            </View>

            {mobile.length > 0 && (
              <View className="mt-3">
                {isValid ? (
                  <Text className="text-green-400 text-sm font-medium">Mobile number is valid</Text>
                ) : (
                  <Text className="text-red-400 text-sm font-medium">
                    Please enter a valid 10-digit mobile number
                  </Text>
                )}
              </View>
            )}

            {/* Error Message */}
            {error && (
              <View className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <Text className="text-red-400 text-sm font-medium">
                  {error}
                </Text>
              </View>
            )}
          </View>

          {/* Info Section */}
          <View className="bg-white/5 rounded-2xl p-5 mb-8 border border-white/10">
            <Text className="text-white text-sm font-semibold mb-2">
              Why do we need your mobile number?
            </Text>
            <Text className="text-white/70 text-sm leading-5">
              • Secure login with OTP verification{"\n"}
              • Transaction alerts and notifications{"\n"}
              • Account security and fraud protection
            </Text>
          </View>

          {/* Continue Button */}
          <View className="mt-auto">
            <Pressable
              onPress={handleContinue}
              className={`rounded-2xl py-4 px-6 ${isValid && !isLoading
                ? 'bg-white'
                : 'bg-white/20 border border-white/30'
                }`}
              disabled={!isValid || isLoading}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                className={`text-center text-lg font-semibold ${isValid && !isLoading ? 'text-gray-900' : 'text-white/50'
                  }`}
              >
                {isLoading ? 'Verifying...' : 'Send OTP'}
              </Text>
            </Pressable>

            <Text className="text-white/50 text-xs text-center mt-4">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}