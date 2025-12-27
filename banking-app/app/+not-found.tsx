import { Link, Stack } from 'expo-router';
import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        className="flex-1"
      >
        <SafeAreaView className="flex-1">
          <View className="flex-1 items-center justify-center px-8">
            <View className="items-center mb-8">
              <Text className="text-6xl mb-4">🚫</Text>
              <Text className="text-3xl font-bold text-white mb-3 text-center">
                Page Not Found
              </Text>
              <Text className="text-white/70 text-lg text-center leading-6">
                The screen you're looking for doesn't exist.
              </Text>
            </View>
            
            <Link href="/" asChild>
              <Pressable className="bg-white rounded-2xl py-4 px-8">
                <Text className="text-gray-900 text-lg font-semibold text-center">
                  Go to Home Screen
                </Text>
              </Pressable>
            </Link>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}
