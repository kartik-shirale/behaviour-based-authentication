import { BackButton } from '@/components/ui/BackButton';
import { router } from 'expo-router';
import { Shield } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, Text, View } from 'react-native';
import DataCollectionTextInput from '../../components/DataCollectionTextInput';
import { useDataCollectionStore } from '../../stores/useDataCollectionStore';
import { useUserStore } from '../../stores/useUserStore';

interface CaptchaChallenge {
  combinedText: string;
  type: 'words' | 'numbers';
  expectedLength: number;
}

// Generate captcha challenge based on current step
const generateCaptchaForStep = (step: 'words' | 'numbers'): CaptchaChallenge => {
  const challengeType = step;

  if (challengeType === 'words') {
    const commonWords = [
      'apple', 'house', 'water', 'light', 'music', 'happy', 'green', 'quick',
      'bread', 'chair', 'phone', 'smile', 'cloud', 'peace', 'heart', 'dream',
      'ocean', 'flower', 'bright', 'sweet', 'fresh', 'clean', 'strong', 'warm',
      'clear', 'sharp', 'smooth', 'quiet', 'gentle', 'simple', 'honest', 'brave'
    ];

    // Select 3 random words
    const selectedWords = [];
    for (let i = 0; i < 3; i++) {
      const randomIndex = Math.floor(Math.random() * commonWords.length);
      selectedWords.push(commonWords[randomIndex]);
    }

    const combinedText = selectedWords.join(' ');
    return {
      combinedText,
      type: 'words',
      expectedLength: combinedText.length
    };
  } else {
    // Generate 3 groups of 3 numbers each (e.g., "123 456 789")
    const numberGroups = [];
    for (let i = 0; i < 3; i++) {
      let group = '';
      for (let j = 0; j < 3; j++) {
        group += Math.floor(Math.random() * 10).toString();
      }
      numberGroups.push(group);
    }

    const combinedText = numberGroups.join(' ');
    return {
      combinedText,
      type: 'numbers',
      expectedLength: combinedText.length
    };
  }
};

export default function CaptchaVerificationScreen() {
  const [currentChallenge, setCurrentChallenge] = useState<CaptchaChallenge | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'words' | 'numbers'>('words');
  const [completedSteps, setCompletedSteps] = useState<('words' | 'numbers')[]>([]);
  const { user } = useUserStore();
  const { collectKeystroke } = useDataCollectionStore();

  useEffect(() => {
    // Generate initial challenge for words step
    const challenge = generateCaptchaForStep(currentStep);
    setCurrentChallenge(challenge);
  }, [currentStep]);

  const handleInputChange = (text: string) => {
    // Restrict input length based on challenge type
    if (currentChallenge && text.length <= currentChallenge.expectedLength) {
      setUserInput(text);

      // Collect keystroke data for typing behavior analysis
      if (user?.uid) {
        collectKeystroke({
          character: text.slice(-1), // Last typed character
          timestamp: Date.now(),
          inputType: 'text',
          coordinate_x: 0,
          coordinate_y: 0,
          actionValue: 1, // keyup event
        });
      }
    }
  };

  const generateNewChallenge = () => {
    const newChallenge = generateCaptchaForStep(currentStep);
    setCurrentChallenge(newChallenge);
    setUserInput('');
  };

  const handleSubmit = async () => {
    if (!currentChallenge || !userInput.trim()) {
      Alert.alert('Error', 'Please enter the captcha');
      return;
    }

    setIsLoading(true);

    try {
      // Simple validation - check if input matches the challenge
      if (userInput.trim().toLowerCase() === currentChallenge.combinedText.toLowerCase()) {
        // Mark current step as completed
        const newCompletedSteps = [...completedSteps, currentStep];
        setCompletedSteps(newCompletedSteps);

        if (currentStep === 'words') {
          // Move to numbers verification
          setCurrentStep('numbers');
          setUserInput('');
        } else if (currentStep === 'numbers') {
          // Both steps completed - navigate to next screen
          router.push('/(onboarding)/loading-setup');
        }
      } else {
        Alert.alert('Verification Failed', 'The text you entered does not match. Please try again.');
        // Generate new challenge for current step
        generateNewChallenge();
      }
    } catch (error) {
      Alert.alert('Error', 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (!currentChallenge) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-950">
        <View className="flex-1 items-center justify-center">
          <Text className="text-zinc-200 text-lg">Loading verification...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <View className="flex-1 px-6 py-8">
        {/* Header */}
        <View className="flex-row items-center mb-8">
          <BackButton onPress={handleBack} />
          <Text className="text-zinc-100 text-xl font-semibold ml-4">
            Security Verification
          </Text>
        </View>

        {/* Icon */}
        <View className="items-center mb-8">
          <View className="w-16 h-16 rounded-full items-center justify-center mb-6 bg-zinc-700">
            <Shield size={22} color="#d4d4d8" />
          </View>
          <Text className="text-zinc-100 text-2xl font-bold mb-2">
            Identity Verification
          </Text>
          {/* <Text className="text-zinc-400 text-base text-center mb-3">
            {currentChallenge?.type === 'words'
              ? 'Step 1: Please type the three words below exactly as shown'
              : 'Step 2: Please type the three number groups below exactly as shown'
            }
          </Text> */}
          {/* Progress Indicator */}
          <View className="flex-row justify-center items-center space-x-2">
            <View className={`w-3 h-3 rounded-full ${completedSteps.includes('words') ? 'bg-green-500' :
              currentStep === 'words' ? 'bg-zinc-400' : 'bg-zinc-700'
              }`} />
            <View className="w-4 h-0.5 bg-zinc-600" />
            <View className={`w-3 h-3 rounded-full ${completedSteps.includes('numbers') ? 'bg-green-500' :
              currentStep === 'numbers' ? 'bg-zinc-400' : 'bg-zinc-700'
              }`} />
          </View>
          <Text className="text-zinc-500 text-xs text-center mt-2">
            {currentStep === 'words' ? 'Words Verification' : 'Numbers Verification'}
          </Text>
        </View>

        {/* Challenge Display */}
        <View className="bg-zinc-900/50 rounded-xl p-4 mb-6 border border-zinc-800/50">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-zinc-400 text-sm">
              {currentChallenge?.type === 'words'
                ? 'Three words to type:'
                : 'Three number groups to type:'
              }
            </Text>
            <Pressable
              onPress={generateNewChallenge}
              className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700"
            >
              <Text className="text-zinc-300 text-xs">Refresh</Text>
            </Pressable>
          </View>
          <Text className="text-zinc-100 text-2xl font-mono leading-6 text-center">
            {currentChallenge?.combinedText}
          </Text>
        </View>

        {/* Input Field */}
        <View className="mb-6">
          <Text className="text-zinc-400 text-sm mb-2">
            Your input:
          </Text>
          <DataCollectionTextInput
            value={userInput}
            onChangeText={handleInputChange}
            placeholder={currentChallenge?.type === 'words' ? 'Enter the three words' : 'Enter the number groups'}
            placeholderTextColor="#71717a"
            className="bg-zinc-800/50 text-zinc-100 text-2xl p-4 rounded-xl border border-zinc-700/50 text-center tracking-widest font-mono"
            multiline={false}
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            textContentType="password"
            inputType={`${currentChallenge?.type === 'words' ? 'text' : 'mobile'}`}
            editable={!isLoading}
          />
          {/* Character Counter */}
          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-zinc-500 text-xs">
              {currentChallenge?.type === 'words' ? 'Words' : 'Numbers'} verification
            </Text>
            <Text className="text-zinc-500 text-xs">
              {userInput.length}/{currentChallenge?.expectedLength || 0}
            </Text>
          </View>
        </View>

        {/* Navigation Buttons */}
        <View className="flex-row mb-8 gap-3">
          {/* <Pressable
            onPress={() => {
              if (currentStep === 'numbers') {
                setCurrentStep('words');
                setUserInput('');
                // Remove numbers from completed steps if going back
                setCompletedSteps(completedSteps.filter(step => step !== 'numbers'));
              }
            }}
            disabled={currentStep === 'words'}
            className={`flex-1 py-4 px-6 rounded-xl items-center justify-center border ${currentStep === 'words'
                ? 'bg-zinc-900/30 border-zinc-800/30'
                : 'bg-zinc-800/50 border-zinc-700/50'
              }`}
          >
            <Text className={`text-lg font-semibold ${currentStep === 'words' ? 'text-zinc-600' : 'text-zinc-300'
              }`}>
              {currentStep === 'words' ? 'Step 1 of 2' : 'Back to Words'}
            </Text>
          </Pressable> */}
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading || !userInput.trim()}
            className={`flex-1 py-4 px-6 rounded-xl items-center justify-center border ${isLoading || !userInput.trim()
              ? 'bg-zinc-800/50 border-zinc-700/50'
              : 'bg-zinc-700 border-zinc-600'
              }`}
          >
            <Text className={`text-lg font-semibold ${isLoading || !userInput.trim() ? 'text-zinc-500' : 'text-zinc-100'
              }`}>
              {isLoading ? 'Processing...' :
                currentStep === 'words' ? 'Continue to Numbers' : 'Complete Verification'
              }
            </Text>
          </Pressable>
        </View>

        {/* Help Text */}
        <View className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800/30">
          <Text className="text-zinc-500 text-sm text-center">
            {currentStep === 'words'
              ? 'Step 1 of 2: This security verification helps protect your account by analyzing your typing patterns. First, type the three words exactly as shown.'
              : 'Step 2 of 2: Now type the three number groups exactly as shown. This completes your behavioral verification process.'
            }
          </Text>
          {completedSteps.length > 0 && (
            <View className="mt-3 pt-3 border-t border-zinc-800/50">
              <Text className="text-green-400 text-xs text-center">
                ✓ {completedSteps.includes('words') ? 'Words verification completed' : ''}
                {completedSteps.includes('numbers') ? ' • Numbers verification completed' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}