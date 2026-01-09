import { BackButton } from '@/components/ui/BackButton';
import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import { AlertTriangle, BarChart3, ChevronRight, CreditCard, HelpCircle, Lock, LogOut, Settings, Share2, Upload, User } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Alert, Image, Pressable, SafeAreaView, ScrollView, Share, Text, View } from 'react-native';

export default function ProfileScreen() {
  const { user, logout } = useUserStore();


  const handleShareProfile = useCallback(async () => {
    if (!user?.fullName || !user?.mobile) return;

    try {
      await Share.share({
        message: `Contact me for payments: ${user.fullName} - ${user.mobile}`,
        title: 'My Payment Details'
      });
    } catch (error) {
      // Error sharing
    }
  }, [user?.fullName, user?.mobile]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  }, [logout]);





  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-6 py-5 border-b border-zinc-800/50">
        <View className="flex-row items-center justify-between">
          <BackButton />
          <Text className="text-white text-lg font-bold">Profile</Text>
          <Pressable onPress={handleShareProfile} className="w-10 h-10 items-center justify-center">
            <Upload size={24} color="white" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {/* Profile Info */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-purple-600 rounded-full items-center justify-center mb-4 overflow-hidden">
            {user?.profile ? (
              <Image
                source={{ uri: user.profile }}
                className="w-full h-full"
                style={{ resizeMode: 'cover' }}
              />
            ) : (
              <Text className="text-white text-3xl font-bold">
                {(user?.fullName || 'JD').split(' ').map(n => n[0]).join('').toUpperCase()}
              </Text>
            )}
          </View>
          <Text className="text-white text-xl font-bold mb-2">
            {user?.fullName || 'User'}
            {!user?.fullName && (
              <AlertTriangle size={12} color="#f87171" style={{ marginLeft: 8 }} />
            )}
          </Text>
          <Text className="text-gray-300 text-base mb-1">
            {user?.mobile || 'N/A'}
            {!user?.mobile && (
              <AlertTriangle size={12} color="#f87171" style={{ marginLeft: 8 }} />
            )}
          </Text>
          <Text className={`text-sm ${user?.balance && user.balance > 1000 ? 'text-green-400' :
            user?.balance && user.balance > 100 ? 'text-yellow-400' : 'text-red-400'
            }`}>
            Balance: ₹{user?.balance?.toFixed(2) || '0.00'}
          </Text>
          {(!user?.fullName || !user?.mobile) && (
            <View className="flex-row items-center mt-2">
              <AlertTriangle size={12} color="#f87171" />
              <Text className="text-red-400 text-xs ml-1 text-center">
                Complete profile required for QR payments
              </Text>
            </View>
          )}
        </View>

        {/* Share Profile Section */}
        <View className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-6 mb-6">
          <Text className="text-white text-lg font-bold mb-4">Share Payment Details</Text>
          <View className="items-center py-4">
            <View className="w-16 h-16 bg-zinc-900 border border-zinc-800/50 rounded-full items-center justify-center mb-4 overflow-hidden">
              <Upload size={32} color="#9333ea" />
            </View>
            <Text className="text-white font-medium text-center mb-2">
              Share Your Payment Information
            </Text>
            <Text className="text-gray-400 text-sm text-center mb-4">
              Share your contact details for payments
            </Text>
            <Pressable
              onPress={handleShareProfile}
              className="bg-purple-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-medium">Share Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Profile Actions */}
        <View className=" flex flex-col gap-2 justify-center  mb-6">

          <Pressable
            onPress={() => router.push('/(app)/my-card')}
            className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <CreditCard size={24} color="white" style={{ marginRight: 16 }} />
              <Text className="text-white font-medium">My Cards</Text>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(app)/transactions')}
            className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <BarChart3 size={24} color="white" style={{ marginRight: 16 }} />
              <Text className="text-white font-medium">Transaction History</Text>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </Pressable>

          <Pressable className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Settings size={24} color="white" style={{ marginRight: 16 }} />
              <Text className="text-white font-medium">Settings</Text>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </Pressable>

          <Pressable className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Lock size={24} color="white" style={{ marginRight: 16 }} />
              <Text className="text-white font-medium">Security</Text>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </Pressable>

          <Pressable className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <HelpCircle size={24} color="white" style={{ marginRight: 16 }} />
              <Text className="text-white font-medium">Help & Support</Text>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          className="bg-red-600 rounded-2xl p-4 mb-6"
        >
          <Text className="text-white font-medium text-center">Logout</Text>
        </Pressable>

        {/* App Info */}
        <View className="items-center py-4">
          <Text className="text-gray-500 text-sm">Sentinel v1.0.0</Text>
          <Text className="text-gray-600 text-xs mt-1">Secure • Biometric • Private</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}