import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useUserStore } from '../stores/useUserStore';

// Import LocalAuthentication for native Android
let LocalAuthentication: any = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch (error) {
  console.warn('expo-local-authentication not available:', error);
}

interface PinVerificationProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

export default function PinVerification({
  visible,
  onClose,
  onSuccess,
  title = 'Enter PIN',
  subtitle = 'Please enter your 4-digit PIN to continue'
}: PinVerificationProps) {
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const maxAttempts = 3;

  const { validatePin } = useUserStore();

  // Check biometric support
  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      if (!LocalAuthentication) {
        setIsBiometricSupported(false);
        return;
      }

      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      setIsBiometricSupported(compatible && enrolled);

      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Fingerprint');
      } else {
        setBiometricType('Biometric');
      }
    } catch (error) {
      console.error('Error checking biometric support:', error);
      setIsBiometricSupported(false);
    }
  };

  const handleNumberPress = async (number: string) => {
    if (isLocked || pin.length >= 4 || isValidating) return;

    const newPin = pin + number;
    setPin(newPin);
    setError(null);

    if (newPin.length === 4) {
      setTimeout(() => verifyPin(newPin), 100);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const verifyPin = async (pinToVerify: string) => {
    setIsValidating(true);
    try {
      // Verify PIN using secure validation
      const isValid = await validatePin(pinToVerify);

      if (isValid) {
        // Success
        setPin('');
        setAttempts(0);
        setError(null);
        onSuccess();
      } else {
        // Failed attempt
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin('');

        if (newAttempts >= maxAttempts) {
          setIsLocked(true);
          setLockTimeRemaining(30);
          setError('Too many failed attempts. Please wait 30 seconds.');

          // Start countdown
          const countdown = setInterval(() => {
            setLockTimeRemaining(prev => {
              if (prev <= 1) {
                clearInterval(countdown);
                setIsLocked(false);
                setAttempts(0);
                setError(null);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setError(`Invalid PIN. ${maxAttempts - newAttempts} attempts remaining.`);
        }
      }
    } catch (error) {
      setError('Failed to verify PIN. Please try again.');
      setPin('');
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setAttempts(0);
    onClose();
  };

  const renderPinDots = () => {
    return (
      <View className="flex-row justify-center gap-4 mb-8">
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            className={`w-4 h-4 rounded-full ${index < pin.length
              ? (error ? 'bg-red-500' : 'bg-green-400')
              : 'bg-zinc-700'
              } ${isValidating && index < pin.length ? 'animate-pulse' : ''}`}
          />
        ))}
      </View>
    );
  };

  const handleBiometricAuth = async () => {
    if (isLocked) return;

    try {
      if (!LocalAuthentication || !isBiometricSupported) {
        setError('Biometric authentication is not available on this device.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Authenticate with ${biometricType}`,
        description: 'Use your biometric to complete the payment',
        fallbackLabel: 'Use PIN instead',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setPin('');
        setAttempts(0);
        setError(null);
        onSuccess();
      } else if (result.error === 'user_cancel') {
        // User cancelled, do nothing
      } else if (result.error === 'user_fallback') {
        // User chose to use PIN instead
      } else {
        setError('Biometric authentication failed. Please try again or use PIN.');
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      setError('Biometric authentication failed. Please use PIN.');
    }
  };

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['👆', '0', '⌫']
    ];

    return (
      <View className="gap-4">

        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row justify-center gap-4">
            {row.map((number, colIndex) => (
              <Pressable
                key={colIndex}
                onPress={() => {
                  if (number === '⌫') {
                    handleBackspace();
                  } else if (number === '👆') {
                    if (isBiometricSupported) {
                      handleBiometricAuth();
                    } else {
                      setError('Biometric authentication is not available on this device.');
                    }
                  } else if (number !== '') {
                    handleNumberPress(number);
                  }
                }}
                className={`w-16 h-16 rounded-full items-center justify-center ${number === '' ? '' : number === '👆' ?
                  (isBiometricSupported && !isLocked ? 'bg-zinc-900/70 border border-zinc-800/50' : 'bg-zinc-700') :
                  (isLocked || isValidating ? 'bg-zinc-700 opacity-50' : 'bg-zinc-900/70 border border-zinc-800/50')
                  }`}
                disabled={isLocked || (number === '⌫' && pin.length === 0) || (isValidating && number !== '⌫')}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text className={`text-xl font-medium ${isLocked ? 'text-zinc-500' : 'text-white'
                  }`}>
                  {number}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-zinc-950 rounded-t-3xl p-6 pb-8">
          {/* Header */}
          <View className="items-center mb-8">
            <View className="w-12 h-1 bg-zinc-600 rounded-full mb-6" />
            <Text className="text-white text-xl font-bold mb-2">
              {isLocked ? 'Account Temporarily Locked' : title}
            </Text>
            <Text className="text-zinc-400 text-center mb-2">
              {isLocked
                ? `Please wait ${lockTimeRemaining} seconds before trying again`
                : subtitle
              }
            </Text>
            {attempts > 0 && !isLocked && (
              <Text className="text-yellow-400 text-sm text-center mb-2">
                {attempts === 1 ? '1 failed attempt' : `${attempts} failed attempts`}
              </Text>
            )}
            {error && (
              <View className="bg-red-600/10 border border-red-600/30 rounded-xl p-3 mb-2">
                <Text className="text-red-400 text-sm text-center">{error}</Text>
              </View>
            )}
            {isValidating && (
              <View className="flex-row justify-center items-center">
                <View className="w-2 h-2 bg-green-400 rounded-full mr-2" />
                <Text className="text-green-400 text-sm">Validating...</Text>
              </View>
            )}
          </View>

          {/* PIN Dots */}
          {renderPinDots()}

          {/* Number Pad */}
          {renderNumberPad()}

          {/* Cancel Button */}
          <Pressable
            onPress={handleClose}
            className="mt-6 py-4"
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text className="text-zinc-400 text-center font-medium">
              Cancel
            </Text>
          </Pressable>

          {/* Demo Hint and Status */}
          {/* <View className="mt-4 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/30">
            {!isLocked ? (
              <Text className="text-zinc-400 text-xs text-center">
                Demo PIN: 1234 {isBiometricSupported ? `| 👆 ${biometricType}` : '| Biometric not available'}
              </Text>
            ) : (
              <Text className="text-red-400 text-xs text-center">
                🔒 Account locked due to multiple failed attempts
              </Text>
            )}
          </View> */}
        </View>
      </View>
    </Modal>
  );
}