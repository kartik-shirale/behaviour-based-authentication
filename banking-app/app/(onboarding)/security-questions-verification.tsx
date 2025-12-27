import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DataCollectionTextInput from '../../components/DataCollectionTextInput';
import { firebaseService } from '../../services/firebaseService';
import { useDataCollectionStore } from '../../stores/useDataCollectionStore';
import { useUserStore } from '../../stores/useUserStore';

interface SecurityQuestion {
  id: string;
  question: string;
  answer: string;
}

export default function SecurityQuestionsVerificationScreen() {
  const [userSecurityQuestions, setUserSecurityQuestions] = useState<SecurityQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { user } = useUserStore();
  const { currentSession, clearSession } = useDataCollectionStore();

  useEffect(() => {
    loadUserSecurityQuestions();
  }, []);

  const loadUserSecurityQuestions = async () => {
    try {
      if (!user?.uid) throw new Error('User not authenticated');

      const result = await firebaseService.getSecurityQuestions(user.uid);

      if (result.success && result.questions.length > 0) {
        const transformedQuestions: SecurityQuestion[] = result.questions.map((q) => ({
          id: q.id,
          question: q.question,
          answer: '',
        }));
        setUserSecurityQuestions(transformedQuestions);
      } else {
        router.replace('./suspicious-activity');
        return;
      }
    } catch (error) {
      setError('Failed to load security questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer.trim().toLowerCase(),
    }));
  };

  const verifyAnswers = async () => {
    try {
      setIsVerifying(true);
      setError(null);

      if (!user?.uid) throw new Error('User not authenticated');

      const unansweredQuestions = userSecurityQuestions.filter(
        (q) => !answers[q.id] || answers[q.id].length === 0
      );
      if (unansweredQuestions.length > 0) {
        setError('Please answer all security questions');
        return;
      }

      const answersForValidation = userSecurityQuestions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id] || '',
      }));

      const validationResult = await firebaseService.validateSecurityQuestions(
        user.uid,
        answersForValidation
      );

      if (validationResult.success) {
        await firebaseService.updateUserData(user.uid, {
          securityQuestionsVerified: true,
          lastSecurityVerification: new Date().toISOString(),
        });
        await performPostSecurityAnalysis(user.uid);

        // Check if this is re-registration flow
        const { collectionScenario } = useDataCollectionStore.getState();

        if (collectionScenario === 're-registration') {
          // For re-registration, complete the authentication process and store credentials
          Alert.alert(
            'Verification Successful',
            `Your identity has been verified successfully. (${validationResult.correctAnswers}/${validationResult.totalQuestions} correct)`,
            [{
              text: 'Continue',
              onPress: async () => {
                try {
                  // Store user credentials after successful security verification
                  const { storeUserCredentials, pin: tempPin } = useUserStore.getState();

                  if (tempPin && user?.uid) {
                    await storeUserCredentials(
                      user.uid,
                      tempPin,
                      user.biometricEnabled || false
                    );
                    console.log('✅ User credentials stored after security verification');
                  }

                  router.replace('/(app)/dashboard');
                } catch (error) {
                  console.error('Failed to complete re-registration:', error);
                  setError('Failed to complete registration. Please try again.');
                }
              }
            }]
          );
        } else {
          // For first-time registration, also store credentials
          Alert.alert(
            'Verification Successful',
            `Your identity has been verified successfully. (${validationResult.correctAnswers}/${validationResult.totalQuestions} correct)`,
            [{
              text: 'Continue',
              onPress: async () => {
                try {
                  // Store user credentials after successful security verification
                  const { storeUserCredentials, pin: tempPin } = useUserStore.getState();

                  if (tempPin && user?.uid) {
                    await storeUserCredentials(
                      user.uid,
                      tempPin,
                      user.biometricEnabled || false
                    );
                    console.log('✅ User credentials stored after security verification');
                  }

                  router.replace('/(app)/dashboard');
                } catch (error) {
                  console.error('Failed to complete registration:', error);
                  setError('Failed to complete registration. Please try again.');
                }
              }
            }]
          );
        }
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= 3) {
          Alert.alert(
            'Verification Failed',
            'Too many incorrect answers. For security reasons, your account will be reviewed.',
            [{ text: 'OK', onPress: () => router.replace('./suspicious-activity') }]
          );
        } else {
          setError(`${validationResult.message} ${3 - newAttempts} attempts remaining.`);
          setAnswers({});
        }
      }
    } catch (error) {
      setError('Database validation failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const getQuestionText = (questionId: string) => {
    const userQuestion = userSecurityQuestions.find((q) => q.id === questionId);
    return userQuestion?.question || 'Security Question';
  };

  const performPostSecurityAnalysis = async (userId: string) => {
    try {
      const behaviorAnalysis = {
        sessionId: currentSession?.sessionId || 'unknown',
        userId: userId,
        verificationTimestamp: new Date().toISOString(),
        riskAssessment: { verificationMethod: 'security_questions', verificationSuccess: true },
      };
      await firebaseService.updateUserData(userId, {
        lastBehaviorAnalysis: behaviorAnalysis,
      });
      clearSession();
    } catch (error) {
      console.error('❌ Error performing post-security analysis:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-950">
        <View className="flex-1 justify-center items-center">
          <Text className="text-zinc-400 text-lg">Loading security questions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <ScrollView className="flex-1 px-6 py-8">
        {/* Header */}
        <View className="mb-8 ">
          <Text className="text-2xl font-bold text-white mb-2">Security Verification</Text>
          <Text className="text-zinc-400 text-base leading-6">
            For your security, please answer the following questions to verify your identity.
          </Text>
          {attempts > 0 && (
            <Text className="text-red-400 text-sm mt-2">Attempts remaining: {3 - attempts}</Text>
          )}
        </View>

        {/* Error Message */}
        {error && (
          <View className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6">
            <Text className="text-red-400 text-center font-medium">{error}</Text>
          </View>
        )}

        {/* Security Questions */}
        <View className="space-y-6 mb-8">
          {userSecurityQuestions.map((question, index) => (
            <View key={question.id}>
              <Text className="text-white font-semibold mb-3 text-base">
                {index + 1}. {getQuestionText(question.id)}
              </Text>
              <DataCollectionTextInput
                className="bg-zinc-900/70 border border-zinc-800/50 rounded-xl px-4 py-4 text-white text-base"
                placeholder="Enter your answer"
                placeholderTextColor="#a1a1aa"
                value={answers[question.id] || ''}
                onChangeText={(text) => handleAnswerChange(question.id, text)}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={false}
                editable={!isVerifying}
                inputType="text"
              />
            </View>
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          className={`py-4 rounded-xl mb-6 ${isVerifying || Object.keys(answers).length < userSecurityQuestions.length
            ? 'bg-zinc-800/50 border border-zinc-700/50'
            : 'bg-zinc-100'
            }`}
          onPress={verifyAnswers}
          disabled={isVerifying || Object.keys(answers).length < userSecurityQuestions.length}
        >
          <Text className={`text-center font-semibold text-lg ${isVerifying || Object.keys(answers).length < userSecurityQuestions.length
            ? 'text-zinc-500'
            : 'text-zinc-900'
            }`}>
            {isVerifying ? 'Verifying...' : 'Verify Identity'}
          </Text>
        </TouchableOpacity>

        {/* Security Notice */}
        <View className="bg-zinc-900/70 border border-zinc-800/50 p-4 rounded-xl">
          <Text className="text-zinc-300 text-sm text-center">
            🔒 Your answers are encrypted and stored securely. This verification helps protect your
            account from unauthorized access.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
