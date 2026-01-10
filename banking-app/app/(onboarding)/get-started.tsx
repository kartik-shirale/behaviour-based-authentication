import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, SafeAreaView, Text, View } from 'react-native';


export default function GetStartedScreen() {
  const setOnboardingStep = useUserStore((state) => state.setOnboardingStep);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleGetStarted = () => {
    setOnboardingStep('permissions');
    router.push('/(onboarding)/permissions');
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Animated.View
        style={{ flex: 1, opacity: fadeAnim }}
        className="justify-between items-center px-6 pb-10"
      >
        {/* Top / Hero Section */}
        <View className="flex-1 justify-center items-center">
          <Image
            source={require('@/assets/logo.png')}
            className="w-32 h-32 mb-6"
            resizeMode="contain"
          />
          <Text className="text-white text-4xl font-bold text-center">
            Welcome to
          </Text>
          <Text className="text-[#0ED068] text-4xl font-extrabold text-center mt-1">
            Sential
          </Text>
          <Text className="text-gray-400 text-lg text-center leading-6 mt-3 px-6">
            Take control of your finance
          </Text>
        </View>

        {/* CTA Button */}
        <Pressable
          onPress={handleGetStarted}
          className="bg-[#0ED068] rounded-full py-5 px-8 flex-row items-center justify-center w-full"
          style={({ pressed }) => ({
            opacity: pressed ? 0.85 : 1,
            shadowColor: '#0ED068',
            shadowOpacity: 0.4,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 10,
            elevation: 5,
          })}
        >
          <Text className="text-black text-lg font-bold mr-3">GET STARTED</Text>
          <View className="w-9 h-9 bg-black rounded-full items-center justify-center">
            <ChevronRight size={18} color="#0ED068" />
          </View>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}
