import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import { ChevronRight, Shield, Fingerprint, Lock } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, SafeAreaView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function GetStartedScreen() {
  const setOnboardingStep = useUserStore((state) => state.setOnboardingStep);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    setOnboardingStep('permissions');
    router.push('/(onboarding)/permissions');
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Subtle gradient overlay */}
      <View className="absolute inset-0">
        <View className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-emerald-950/30 to-transparent" />
        <View className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-emerald-950/20 to-transparent" />
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }}
        className="justify-between items-center px-6 pb-10"
      >
        {/* Top / Hero Section */}
        <View className="flex-1 justify-center items-center">
          {/* Logo with glow effect */}
          <Animated.View
            style={{ transform: [{ scale: scaleAnim }] }}
            className="mb-8"
          >
            <View className="absolute -inset-4 bg-emerald-500/10 rounded-full blur-xl" />
            <Image
              source={require('@/assets/logo.png')}
              className="w-36 h-36"
              resizeMode="contain"
            />
          </Animated.View>

          <Text className="text-zinc-400 text-lg font-medium tracking-wide mb-2">
            Welcome to
          </Text>
          <Text className="text-[#0ED068] text-5xl font-extrabold text-center tracking-tight">
            Sentinel
          </Text>
          <Text className="text-zinc-500 text-base text-center leading-6 mt-4 px-8">
            Your secure behavioral biometrics banking companion
          </Text>

          {/* Feature highlights */}
          <View className="flex-row justify-center mt-10 space-x-6">
            <View className="items-center">
              <View className="w-12 h-12 bg-emerald-500/10 rounded-full items-center justify-center mb-2">
                <Shield size={22} color="#0ED068" />
              </View>
              <Text className="text-zinc-500 text-xs">Secure</Text>
            </View>
            <View className="items-center mx-8">
              <View className="w-12 h-12 bg-emerald-500/10 rounded-full items-center justify-center mb-2">
                <Fingerprint size={22} color="#0ED068" />
              </View>
              <Text className="text-zinc-500 text-xs">Biometric</Text>
            </View>
            <View className="items-center">
              <View className="w-12 h-12 bg-emerald-500/10 rounded-full items-center justify-center mb-2">
                <Lock size={22} color="#0ED068" />
              </View>
              <Text className="text-zinc-500 text-xs">Private</Text>
            </View>
          </View>
        </View>

        {/* CTA Button */}
        <View className="w-full">
          <Pressable
            onPress={handleGetStarted}
            className="bg-[#0ED068] rounded-2xl py-5 px-8 flex-row items-center justify-center"
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
              shadowColor: '#0ED068',
              shadowOpacity: 0.5,
              shadowOffset: { width: 0, height: 8 },
              shadowRadius: 16,
              elevation: 8,
            })}
          >
            <Text className="text-black text-lg font-bold mr-3">GET STARTED</Text>
            <View className="w-9 h-9 bg-black/20 rounded-full items-center justify-center">
              <ChevronRight size={18} color="black" />
            </View>
          </Pressable>

          <Text className="text-zinc-600 text-xs text-center mt-4">
            By continuing, you agree to our Terms of Service
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
