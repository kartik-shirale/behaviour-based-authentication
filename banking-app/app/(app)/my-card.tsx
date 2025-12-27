import { BackButton } from '@/components/ui/BackButton';
import { useUserStore } from '@/stores/useUserStore';
import React, { useState } from 'react';
import { Dimensions, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

const { width } = Dimensions.get('window');
const cardWidth = width - 48; // 24px padding on each side

export default function MyCardScreen() {
  const { user } = useUserStore();
  const [showPin, setShowPin] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);

  // Card data - using default values for demo purposes
  const cardData = {
    cardNumber: '4532 1234 5678 9012',
    expiryDate: '12/28',
    cvv: '123',
    pin: '1234',
    cardType: 'VISA',
    cardName: 'DEBIT CARD'
  };

  // Check if user has a card - default to true for demo purposes
  const hasCard = true;

  const formatCardNumber = (number: string, show: boolean) => {
    if (show) return number;
    return number.replace(/\d(?=\d{4})/g, '•');
  };

  const formatPin = (pin: string, show: boolean) => {
    if (show) return pin;
    return '••••';
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 py-6 border-b  border-zinc-800/50">
        <View className="flex-row items-center justify-between">
          <BackButton />
          <Text className="text-white text-lg font-bold">My Card</Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-8">
        {/* Virtual Debit Card */}
        <View className="mb-">
          <View
            className="rounded-3xl p-6 mb-6 shadow-2xl"
            style={{
              width: cardWidth,
              height: cardWidth * 0.63, // Standard card ratio
              backgroundColor: '#1a1a2e',
            }}
          >
            {/* Card Background Gradient */}
            {/* <View className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800" /> */}

            {/* Card Content */}
            <View className="flex-1 relative  z-10">
              {/* Card Type and Logo */}
              <View className="flex-row justify-between items-start -mb-6">
                <View>
                  <Text className="text-white text-sm font-medium opacity-90">
                    {cardData.cardName}
                  </Text>
                  <Text className="text-white text-xs opacity-70">
                    Virtual Card
                  </Text>
                </View>
                <View className="bg-white/20 px-3 py-1 rounded-lg">
                  <Text className="text-white text-sm font-bold">
                    {cardData.cardType}
                  </Text>
                </View>
              </View>

              {/* Chip */}
              <View className="w-12 h-9 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-lg mb-6 shadow-lg" />

              {/* Card Number */}
              <Pressable
                onPress={() => setShowCardNumber(!showCardNumber)}
                className="mb-10"
              >
                <Text className="text-white  text-lg font-mono tracking-wider">
                  {formatCardNumber(cardData.cardNumber, showCardNumber)}
                </Text>
                <Text className="text-white/60 text-xs mt-1">
                  Tap to {showCardNumber ? 'hide' : 'show'} number
                </Text>
              </Pressable>

              {/* Card Holder and Expiry */}
              <View className="flex-row justify-between items-end">
                <View className="flex-1">
                  <Text className="text-white/70 text-xs uppercase tracking-wide mb-1">
                    Card Holder
                  </Text>
                  <Text className="text-white text-xs font-medium uppercase">
                    {user?.fullName || 'JOHN DOE'}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-white/70 text-xs uppercase tracking-wide mb-1">
                    Expires
                  </Text>
                  <Text className="text-white text-xs font-medium">
                    {cardData.expiryDate}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Card Details */}
        <View className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-6 mb-6">
          <Text className="text-white text-lg font-bold mb-4">Card Details</Text>

          <View className="space-y-4">
            {/* Card Number */}
            <View className="flex-row justify-between items-center py-3 border-b border-zinc-800/50">
              <Text className="text-gray-400">Card Number</Text>
              <Pressable onPress={() => setShowCardNumber(!showCardNumber)}>
                <Text className="text-white font-mono">
                  {formatCardNumber(cardData.cardNumber, showCardNumber)}
                </Text>
              </Pressable>
            </View>

            {/* PIN */}
            <View className="flex-row justify-between items-center py-3 border-b border-zinc-800/50">
              <Text className="text-gray-400">PIN</Text>
              <Pressable onPress={() => setShowPin(!showPin)} className="flex-row items-center">
                <Text className="text-white font-mono mr-2">
                  {formatPin(cardData.pin, showPin)}
                </Text>
                <Text className="text-purple-400 text-xs">
                  {showPin ? '👁️' : '👁️‍🗨️'}
                </Text>
              </Pressable>
            </View>

            {/* CVV */}
            <View className="flex-row justify-between items-center py-3 border-b border-zinc-800/50">
              <Text className="text-gray-400">CVV</Text>
              <Text className="text-white font-mono">•••</Text>
            </View>

            {/* Expiry Date */}
            <View className="flex-row justify-between items-center py-3 border-b border-zinc-800/50">
              <Text className="text-gray-400">Expiry Date</Text>
              <Text className="text-white font-medium">{cardData.expiryDate}</Text>
            </View>

            {/* Card Type */}
            <View className="flex-row justify-between items-center py-3">
              <Text className="text-gray-400">Card Type</Text>
              <Text className="text-white font-medium">{cardData.cardType} Debit</Text>
            </View>
          </View>
        </View>

        {/* Card Actions */}
        <View className="space-y-3 gap-2">
          <Pressable className="bg-purple-600 rounded-2xl p-4">
            <Text className="text-white font-medium text-center">Block Card</Text>
          </Pressable>

          <Pressable className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-4">
            <Text className="text-white font-medium text-center">Change PIN</Text>
          </Pressable>

          <Pressable className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-4">
            <Text className="text-white font-medium text-center">Card Settings</Text>
          </Pressable>

          <Pressable className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-4">
            <Text className="text-white font-medium text-center">Transaction Limits</Text>
          </Pressable>
        </View>

        {/* Security Notice */}
        <View className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mt-6">
          <View className="flex-row items-start">
            <Text className="text-yellow-400 text-lg mr-3">⚠️</Text>
            <View className="flex-1">
              <Text className="text-yellow-400 font-medium mb-1">Security Notice</Text>
              <Text className="text-yellow-300 text-sm">
                Never share your PIN or card details with anyone. This is a virtual card for demonstration purposes only.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}