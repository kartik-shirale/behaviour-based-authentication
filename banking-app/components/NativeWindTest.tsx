import React from 'react';
import { Pressable, Text, View } from 'react-native';

export function NativeWindTest() {
  return (
    <View className="p-4 m-4 bg-blue-100 dark:bg-blue-900 rounded-lg border-2 border-blue-300 dark:border-blue-700">
      <Text className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-2">
        NativeWind Test
      </Text>
      <Text className="text-blue-600 dark:text-blue-300 mb-4">
        If you can see styled colors and spacing, NativeWind is working!
      </Text>
      <Pressable className="bg-green-500 hover:bg-green-600 active:bg-green-700 px-4 py-2 rounded-md">
        <Text className="text-white font-semibold text-center">
          Test Button
        </Text>
      </Pressable>
    </View>
  );
}