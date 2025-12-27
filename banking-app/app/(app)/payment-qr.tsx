import { useUserStore } from '@/stores/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, Share, Text, View } from 'react-native';

export default function PaymentQRScreen() {
  const { user } = useUserStore();
  const { amount, note, mobile } = useLocalSearchParams<{
    amount: string;
    note?: string;
    mobile?: string;
  }>();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleShareQR = async () => {
    try {
      const message = `Pay ${formatCurrency(Number(amount))} to ${user?.fullName || 'User'}\n\nUPI ID: ${user?.mobile}@paytm\nNote: ${note || 'Payment request'}\n\nScan the QR code or use the UPI ID to make the payment.`;

      await Share.share({
        message,
        title: 'Payment QR Code',
      });
    } catch (error) {
      // Error sharing QR
    }
  };

  return (
    <View className="flex-1 bg-zinc-950">
      <LinearGradient
        colors={['rgba(39, 39, 42, 0.8)', 'rgba(24, 24, 27, 0.9)', 'rgba(9, 9, 11, 1)']}
        className="flex-1"
      >
        <SafeAreaView className="flex-1">
          <View className="flex-1 px-6 py-4">
            {/* Header */}
            <View className="flex-row items-center mb-8">
              <Pressable
                onPress={() => router.back()}
                className="w-12 h-12 rounded-full bg-zinc-800/50 items-center justify-center mr-4"
              >
                <Text className="text-white text-xl">←</Text>
              </Pressable>
              <Text className="text-2xl font-bold text-white">Payment QR Code</Text>
            </View>

            {/* QR Code Container */}
            <View className="flex-1 items-center justify-center">
              <View className="bg-zinc-100 rounded-3xl p-8 items-center shadow-lg">
                {/* QR Code Placeholder */}
                <View className="w-64 h-64 bg-gray-100 rounded-2xl items-center justify-center mb-6 border-2 border-dashed border-gray-300">
                  <Text className="text-6xl mb-4">📱</Text>
                  <Text className="text-gray-600 text-center font-medium">
                    QR Code
                  </Text>
                  <Text className="text-gray-500 text-sm text-center mt-2">
                    Scan to pay {formatCurrency(Number(amount))}
                  </Text>
                </View>

                {/* Payment Details */}
                <View className="items-center">
                  <Text className="text-2xl font-bold text-gray-800 mb-2">
                    {formatCurrency(Number(amount))}
                  </Text>
                  <Text className="text-gray-600 font-medium mb-1">
                    Pay to: {user?.fullName || 'User'}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    UPI ID: {user?.mobile}@paytm
                  </Text>
                  {note && (
                    <Text className="text-gray-500 text-sm mt-2 text-center">
                      Note: {note}
                    </Text>
                  )}
                </View>
              </View>

              {/* Instructions */}
              <View className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-6 mt-8">
                <Text className="text-white font-semibold text-center mb-3">
                  How to use this QR Code
                </Text>
                <Text className="text-white/80 text-sm text-center leading-6">
                  • Open any UPI app on your phone{"\n"}
                  • Tap on 'Scan QR Code' or 'Pay'{"\n"}
                  • Point your camera at this QR code{"\n"}
                  • Verify the amount and complete payment
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="mt-8">
              <Pressable
                onPress={handleShareQR}
                className="bg-zinc-800 rounded-2xl py-4 mb-4"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  Share QR Code
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.back()}
                className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl py-4"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  Back to Request
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}