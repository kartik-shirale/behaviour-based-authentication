import React from 'react';
import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from 'lucide-react-native';

export default function WelcomeScreen() {
  const handleContinue = () => {
    router.push('/(auth)/pin-auth');
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 justify-center items-center px-6">
        {/* Icon Section */}
        <View className="mb-16">
          <LinearGradient
            colors={['#10B981', '#059669']}
            className="w-24 h-24 rounded-full items-center justify-center"
          >
            <View className="w-16 h-16 bg-black rounded-full items-center justify-center">
              <User size={32} color="#4ade80" />
            </View>
          </LinearGradient>
        </View>

        {/* Welcome Text */}
        <View className="mb-12 items-center">
          <Text className="text-white text-4xl font-bold mb-4 text-center">
            Keep up with your
          </Text>
          <Text className="text-white text-4xl font-bold mb-6 text-center">
            wallet
          </Text>
          <Text className="text-gray-400 text-lg text-center leading-6 px-4">
            Get real-time updates and secure access to your financial data
          </Text>
        </View>

        {/* Continue Button */}
        <View className="absolute bottom-20 left-6 right-6">
          <Pressable
            onPress={handleContinue}
            className="bg-green-400 rounded-full py-5 px-8"
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text className="text-black text-lg font-bold text-center">
              CONTINUE
            </Text>
          </Pressable>

          <Pressable className="mt-4 py-4">
            <Text className="text-gray-400 text-center text-base">
              SKIP FOR NOW
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}