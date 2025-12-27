import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { Pressable } from 'react-native';

interface BackButtonProps {
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  className?: string;
}

export function BackButton({
  onPress,
  size = 44,
  iconSize = 24,
  className = ''
}: BackButtonProps) {
  const handlePress = onPress || (() => router.back());

  return (
    <Pressable
      onPress={handlePress}
      className={`w-11 h-11 rounded-full bg-zinc-900/90 border border-zinc-800 items-center justify-center ${className}`}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
        width: size,
        height: size,
      })}
    >
      <ArrowLeft size={iconSize} color="white" />
    </Pressable>
  );
}