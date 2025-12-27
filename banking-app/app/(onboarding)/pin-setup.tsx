import DataCollectionTextInput from '@/components/DataCollectionTextInput';
import { BackButton } from '@/components/ui/BackButton';
import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native';

export default function PinSetupScreen() {
  const { setupPin, isLoading, error, onboardingStep } = useUserStore();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [createdPin, setCreatedPin] = useState('');
  const inputRefs = useRef<TextInput[]>([]);

  const currentPin = step === 'create' ? pin : confirmPin;
  const setCurrentPin = step === 'create' ? setPin : setConfirmPin;

  const handlePinChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newPin = [...currentPin];
    newPin[index] = value;
    setCurrentPin(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-proceed when all digits are entered
    if (newPin.every(digit => digit !== '') && newPin.join('').length === 4) {
      if (step === 'create') {
        setTimeout(() => {
          setCreatedPin(newPin.join(''));
          setStep('confirm');
          // Clear confirm PIN and focus first input
          setConfirmPin(['', '', '', '']);
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }, 500);
      } else {
        // Confirm step
        setTimeout(() => handleSetupPin(newPin.join('')), 500);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !currentPin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSetupPin = async (confirmedPin: string) => {
    if (createdPin !== confirmedPin) {
      Alert.alert(
        'PIN Mismatch',
        'The PINs you entered do not match. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              setStep('create');
              setPin(['', '', '', '']);
              setConfirmPin(['', '', '', '']);
              setCreatedPin('');
              setTimeout(() => inputRefs.current[0]?.focus(), 100);
            }
          }
        ]
      );
      return;
    }

    try {
      await setupPin(createdPin);
      // Navigation will be handled by the store based on user setup status
    } catch (error) {
      Alert.alert('Error', 'Failed to setup PIN. Please try again.');
    }
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('create');
      setConfirmPin(['', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } else {
      router.back();
    }
  };

  // Navigate based on onboarding step changes
  useEffect(() => {
    if (onboardingStep === 'security-questions') {
      router.push('/(onboarding)/security-questions');
    } else if (onboardingStep === 'biometric-setup') {
      router.push('/(onboarding)/biometric-setup');
    } else if (onboardingStep === 'completed') {
      router.replace('/(app)/dashboard');
    }
  }, [onboardingStep]);

  const renderPinDots = (pinArray: string[]) => {
    return (
      <View className="flex-row justify-center mb-12">
        {pinArray.map((digit, index) => (
          <View
            key={index}
            className={`w-5 h-5 rounded-full mx-3 border-2 ${digit ? 'bg-white border-white' : 'bg-transparent border-white/30'
              }`}
          />
        ))}
      </View>
    );
  };

  return (

    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        behavior='height'
        className="flex-1"
      >
        <View className="flex-1 px-8 py-8">
          {/* Header */}
          <View className="mb-16">
            <BackButton onPress={handleBack} className="mb-8" />

            <Text className="text-3xl font-bold text-white mb-3">
              {step === 'create' ? 'Create PIN' : 'Confirm PIN'}
            </Text>
            <Text className="text-white/70 text-lg leading-6">
              {step === 'create'
                ? 'Create a 4-digit PIN to secure your account'
                : 'Re-enter your PIN to confirm'
              }
            </Text>
          </View>

          {/* PIN Display */}
          <View className="items-center mb-16">
            {renderPinDots(currentPin)}
          </View>

          {/* Hidden PIN Input */}
          <View className="flex-row justify-between opacity-0 absolute">
            {currentPin.map((digit, index) => (
              <DataCollectionTextInput
                key={`${step}-${index}`}
                ref={(ref: any) => {
                  if (ref) inputRefs.current[index] = ref;
                }}
                value={digit}
                onChangeText={(value) => handlePinChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                showSoftInputOnFocus={false}
                keyboardType="numeric"
                maxLength={1}
                secureTextEntry
                autoFocus={index === 0}
                inputType="password"
              />
            ))}
          </View>

          {/* Custom Keypad */}
          <View className="flex-1 justify-center">
            <View className="bg-white/5 rounded-3xl p-8 border border-white/10">
              {/* Number Grid */}
              <View className="mb-6">
                {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', '⌫']].map((row, rowIndex) => (
                  <View key={rowIndex} className="flex-row justify-center mb-6">
                    {row.map((num, colIndex) => {
                      if (num === '') {
                        return <View key={colIndex} className="w-20 h-20 mx-4" />;
                      }

                      return (
                        <Pressable
                          key={colIndex}
                          onPress={() => {
                            if (num === '⌫') {
                              // Handle backspace
                              const currentIndex = currentPin.findIndex(digit => digit === '');
                              const indexToDelete = currentIndex === -1 ? 3 : Math.max(0, currentIndex - 1);
                              const newPin = [...currentPin];
                              newPin[indexToDelete] = '';
                              setCurrentPin(newPin);
                              inputRefs.current[indexToDelete]?.focus();
                            } else {
                              // Handle number input
                              const emptyIndex = currentPin.findIndex(digit => digit === '');
                              if (emptyIndex !== -1) {
                                handlePinChange(num, emptyIndex);
                              }
                            }
                          }}
                          className="w-20 h-20 rounded-full bg-white/10 items-center justify-center mx-4 border border-white/20"
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Text className="text-2xl font-semibold text-white">
                            {num}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Security Info */}

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}