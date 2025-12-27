import React, { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { router } from 'expo-router';
import type { AlertPayload } from '../../constants/API_ENDPOINTS';
import { API_ENDPOINTS, buildApiUrl } from '../../constants/API_ENDPOINTS';
import { useUserStore } from '../../stores/useUserStore';

export default function SuspiciousActivityScreen() {
  const [isReporting, setIsReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useUserStore();

  useEffect(() => {
    // Automatically send alert when component mounts
    sendSuspiciousActivityAlert();
  }, []);

  const sendSuspiciousActivityAlert = async () => {
    try {
      setIsReporting(true);
      setError(null);

      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const alertPayload: AlertPayload = {
        userId: user.uid,
        alertType: 'suspicious_behavior',
        severity: 'high',
        description: 'Suspicious activity detected during authentication process',
        metadata: {
          source: 'authentication_flow',
          trigger: 'behavioral_analysis',
          timestamp: new Date().toISOString(),
        },
        deviceInfo: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          platform: typeof navigator !== 'undefined' ? navigator.platform : 'mobile',
          language: typeof navigator !== 'undefined' ? navigator.language : 'en',
        },
        timestamp: Date.now(),
      };

      console.log('Sending suspicious activity alert:', alertPayload);

      // Send alert using direct fetch
      const response = await fetch(buildApiUrl(API_ENDPOINTS.ALERT), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': alertPayload.userId,
          'X-Alert-Type': alertPayload.alertType,
        },
        body: JSON.stringify(alertPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Suspicious activity alert sent successfully:', result);

      setReportSent(true);
    } catch (error) {
      console.error('Error sending suspicious activity alert:', error);
      setError(error instanceof Error ? error.message : 'Failed to send alert');
    } finally {
      setIsReporting(false);
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Please contact our customer support team for assistance with your account verification.',
      [
        {
          text: 'Call Support',
          onPress: () => {
            // In a real app, this would open the phone dialer
            Alert.alert('Support', 'Call: 1-800-BANKING');
          }
        },
        {
          text: 'Email Support',
          onPress: () => {
            // In a real app, this would open the email client
            Alert.alert('Support', 'Email: support@bankingapp.com');
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };



  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <View className="flex-1 px-6 py-8">
        {/* Header Section */}
        <View className="flex-1 justify-center items-center">
          {/* Alert Icon */}
          <View className="mb-12">
            <View className="w-32 h-32 bg-red-600/20 border-2 border-red-500/30 rounded-full items-center justify-center">
              <Text className="text-red-400 text-5xl">⚠️</Text>
            </View>
          </View>

          {/* Main Content Card */}
          <View className="bg-zinc-900/80 border border-zinc-800/60 p-8 rounded-3xl w-full max-w-md">
            <Text className="text-red-400 text-center text-3xl font-bold mb-6">
              Suspicious Activity Detected
            </Text>

            <Text className="text-zinc-300 text-center text-lg leading-7 mb-8">
              For your security, we have detected unusual activity on your account.
              Our security team has been notified and will review your account.
            </Text>

            {/* Status Messages */}
            {isReporting && (
              <View className="bg-blue-600/20 border border-blue-500/30 p-5 rounded-2xl mb-6">
                <Text className="text-blue-400 text-center font-semibold text-base">
                  🔄 Reporting suspicious activity...
                </Text>
              </View>
            )}

            {reportSent && (
              <View className="bg-green-600/20 border border-green-500/30 p-5 rounded-2xl mb-6">
                <Text className="text-green-400 text-center font-semibold text-base">
                  ✅ Security team has been notified
                </Text>
              </View>
            )}

            {error && (
              <View className="bg-red-600/20 border border-red-500/30 p-5 rounded-2xl mb-6">
                <Text className="text-red-400 text-center font-semibold text-base mb-4">
                  ❌ {error}
                </Text>
                <TouchableOpacity
                  className="py-3 px-6 bg-red-600/40 border border-red-500/50 rounded-xl"
                  onPress={sendSuspiciousActivityAlert}
                >
                  <Text className="text-red-300 text-center font-bold">
                    Retry Alert
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Text className="text-zinc-400 text-center text-base leading-6">
              Your account access has been temporarily restricted for security purposes.
            </Text>
          </View>
        </View>

        {/* Bottom Action Section */}
        <View className="pt-8">
          {/* Action Buttons */}
          <View className="space-y-4 mb-8">
            <TouchableOpacity
              className="bg-blue-600 py-5 px-8 rounded-2xl shadow-lg"
              onPress={handleContactSupport}
            >
              <Text className="text-white text-center text-xl font-bold">
                Contact Support
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-zinc-800/80 border border-zinc-700/60 py-5 px-8 rounded-2xl"
              onPress={() => router.back()}
            >
              <Text className="text-zinc-200 text-center text-xl font-semibold">
                Go Back
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Notice */}
          <View className="bg-zinc-900/50 border border-zinc-800/40 p-6 rounded-2xl">
            <Text className="text-zinc-400 text-center text-sm leading-5">
              🔒 This security measure helps protect your account from unauthorized access.
              If you believe this is an error, please contact our support team.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}