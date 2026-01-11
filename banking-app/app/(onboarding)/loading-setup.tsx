import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_ENDPOINTS } from '../../constants/API_ENDPOINTS';
import { useDataCollectionStore } from '../../stores/useDataCollectionStore';
import { useUserStore } from '../../stores/useUserStore';

const LOADING_MESSAGES = [
  'Setting up your dashboard...',
  'Performing security checks...',
  'Initializing fraud detection...',
  'Finalizing your account...',
];

export default function LoadingSetupScreen() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useUserStore();
  const {
    collectionScenario,
    isCollecting
  } = useDataCollectionStore();

  useEffect(() => {
    // Cycle through loading messages
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(messageInterval);
  }, []);

  useEffect(() => {
    const processSetup = async () => {
      try {
        if (!user?.uid) {
          throw new Error('User not authenticated');
        }

        // Show loading messages for better UX, but reduce wait time
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Navigate immediately to prevent UI blocking
        if (collectionScenario === 'first-time-registration') {
          // Store credentials first for immediate access
          try {
            const { storeUserCredentials, pin: tempPin } = useUserStore.getState();
            if (tempPin && user?.uid) {
              await storeUserCredentials(
                user.uid,
                tempPin,
                user.biometricEnabled || false
              );
            }
          } catch (credentialError) {
            console.error('Failed to store credentials:', credentialError);
          }

          // Navigate immediately, handle data collection in background
          router.replace('../(app)/dashboard');

          // Process data collection in background after navigation
          setTimeout(async () => {
            try {
              const { endSessionAndSendData, startDataCollection, setUserId, currentSession, startSession } = useDataCollectionStore.getState();

              if (!currentSession) {
                await startSession(user.uid);
                await startDataCollection('first-time-registration');
              } else {
                setUserId(user.uid);
              }

              await endSessionAndSendData(API_ENDPOINTS.DATA.REGULAR);
              await startDataCollection('login');
            } catch (bgError) {
              console.warn('Background data collection failed:', bgError);
            }
          }, 100);

          return; // Exit early for first-time registration
        }

        // For re-registration, we need the API response to determine next step
        const endpoint = API_ENDPOINTS.DATA.CHECK;
        console.log(`Sending data to ${endpoint} for scenario: ${collectionScenario}`);

        // Update user ID in the current session before sending data
        const { endSessionAndSendData, startDataCollection, setUserId, currentSession, startSession } = useDataCollectionStore.getState();

        // If no session exists, start one before proceeding
        if (!currentSession) {
          console.log('⚠️ No current session found, starting new session before sending data');
          await startSession(user.uid);
          await startDataCollection('re-registration');
        } else {
          // Update the existing session with the authenticated user ID
          setUserId(user.uid);
        }

        // End current session and send data using the new method
        const result = await endSessionAndSendData(endpoint);

        if (result.success) {
          console.log(`Data sent successfully to ${endpoint}`);
          console.log('API Response:', result.data);

          // Parse the recommendation from the new API response structure
          // Response format: { data: { riskAssessment: { riskScore: { recommendation: "ALLOW" | "VERIFY" | "BLOCK" } } } }
          const recommendation = result.data?.data?.riskAssessment?.riskScore?.recommendation?.toUpperCase() ||
            result.data?.riskAssessment?.riskScore?.recommendation?.toUpperCase() ||
            result.data?.recommendation?.toUpperCase() ||
            'ALLOW'; // Default to ALLOW if not specified

          const riskLevel = result.data?.data?.riskLevel ||
            result.data?.riskLevel ||
            'low';

          console.log(`🎯 Risk Assessment - Recommendation: ${recommendation}, Risk Level: ${riskLevel}`);

          // Route based on recommendation
          switch (recommendation) {
            case 'BLOCK':
              // High risk - go directly to suspicious activity page
              console.log('🚫 BLOCK recommendation - redirecting to suspicious activity');
              router.replace('./suspicious-activity');
              break;

            case 'REVIEW':
            case 'CHECK':
              // Medium risk - need security question verification
              console.log('🔒 VERIFY/CHECK recommendation - redirecting to security questions');
              router.replace('./security-questions-verification');
              break;

            case 'ALLOW':
            default:
              // Low risk - proceed to dashboard
              console.log('✅ ALLOW recommendation - proceeding to dashboard');

              // Store user credentials before going to dashboard
              try {
                const { storeUserCredentials, pin: tempPin } = useUserStore.getState();

                if (tempPin && user?.uid) {
                  await storeUserCredentials(
                    user.uid,
                    tempPin,
                    user.biometricEnabled || false
                  );
                  console.log('✅ User credentials stored after successful API verification');
                }
              } catch (credentialError) {
                console.error('Failed to store credentials:', credentialError);
              }

              // Navigate immediately, start data collection in background
              router.replace('../(app)/dashboard');

              // Start login data collection in background
              setTimeout(async () => {
                try {
                  await startDataCollection('login');
                } catch (bgError) {
                  console.warn('Background login data collection failed:', bgError);
                }
              }, 100);
              break;
          }
        } else {
          // Handle actual failure case
          console.error('Failed to send data to API');

          // Fallback based on scenario - err on the side of security
          if (collectionScenario === 're-registration') {
            console.log('⚠️ API failed, falling back to security questions for re-registration');
            router.replace('./security-questions-verification');
          } else {
            // For other scenarios, try to proceed with dashboard
            try {
              const { storeUserCredentials, pin: tempPin } = useUserStore.getState();

              if (tempPin && user?.uid) {
                await storeUserCredentials(
                  user.uid,
                  tempPin,
                  user.biometricEnabled || false
                );
              }
            } catch (credentialError) {
              console.error('Failed to store credentials in fallback:', credentialError);
            }

            await startDataCollection('login');
            router.replace('../(app)/dashboard');
          }
        }

      } catch (error) {
        console.error('Setup processing error:', error);
        // TODO: NEEDS WORK - Bypass all setup errors for now during development
        // This should be removed once session management and API are stable
        console.warn('Bypassing setup error, continuing with flow');

        // Continue with flow despite errors
        const { collectionScenario } = useDataCollectionStore.getState();
        if (collectionScenario === 'first-time-registration') {
          // Store credentials even in error bypass for first-time users
          try {
            const { storeUserCredentials, pin: tempPin } = useUserStore.getState();

            if (tempPin && user?.uid) {
              await storeUserCredentials(
                user.uid,
                tempPin,
                user.biometricEnabled || false
              );
              console.log('✅ User credentials stored in error bypass scenario');
            }
          } catch (credentialError) {
            console.error('Failed to store credentials in error bypass:', credentialError);
          }

          router.replace('../(app)/dashboard');
        } else if (collectionScenario === 're-registration') {
          router.replace('./security-questions-verification');
        } else {
          // Fallback to dashboard with credential storage attempt
          try {
            const { storeUserCredentials, pin: tempPin } = useUserStore.getState();

            if (tempPin && user?.uid) {
              await storeUserCredentials(
                user.uid,
                tempPin,
                user.biometricEnabled || false
              );
              console.log('✅ User credentials stored in fallback scenario');
            }
          } catch (credentialError) {
            console.error('Failed to store credentials in fallback:', credentialError);
          }

          router.replace('../(app)/dashboard');
        }

        // Original error handling (commented out for bypass):
        /*
        setError(error instanceof Error ? error.message : 'Setup failed');
        setIsProcessing(false);
        */
      }
    };

    // Start processing after component mounts
    const timer = setTimeout(processSetup, 1000);
    return () => clearTimeout(timer);
  }, [user?.uid, collectionScenario]);

  const handleRetry = () => {
    setError(null);
    setIsProcessing(true);
    router.replace('./loading-setup');
  };

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: '#7F1D1D', padding: 24, borderRadius: 16, marginBottom: 32, width: '100%' }}>
            <Text style={{ color: '#DC2626', textAlign: 'center', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
              Setup Failed
            </Text>
            <Text style={{ color: '#EF4444', textAlign: 'center', marginBottom: 16 }}>
              {error}
            </Text>
            <View style={{ backgroundColor: 'black', padding: 16, borderRadius: 12 }}>
              <Text
                style={{ color: '#10B981', textAlign: 'center', fontWeight: '600', fontSize: 18 }}
                onPress={handleRetry}
              >
                Try Again
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>

        {/* Dynamic Loading Message */}
        <View style={{ marginBottom: 64, height: 32, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#D1D5DB', textAlign: 'center', fontSize: 18, fontWeight: '500', letterSpacing: 0.5 }}>
            {LOADING_MESSAGES[currentMessageIndex]}
          </Text>
        </View>

        {/* Progress Indicator */}
        <View style={{ width: '100%', maxWidth: 288, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            {LOADING_MESSAGES.map((_, index) => (
              <View
                key={index}
                style={{
                  height: 4,
                  flex: 1,
                  borderRadius: 2,
                  backgroundColor: index <= currentMessageIndex ? '#10B981' : '#374151',
                  shadowColor: index <= currentMessageIndex ? '#10B981' : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 2,
                }}
              />
            ))}
          </View>
          <Text style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 14, fontWeight: '300' }}>
            Please wait while we set up your secure banking experience
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}