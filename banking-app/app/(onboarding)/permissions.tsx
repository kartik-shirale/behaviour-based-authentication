import { useDataCollectionStore } from "@/stores/useDataCollectionStore";
import { useUserStore } from "@/stores/useUserStore";
import * as Contacts from "expo-contacts";
import * as Location from "expo-location";
import { requireNativeModule } from "expo-modules-core";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Check,
  MapPin,
  RefreshCw,
  Users,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

let BehavioralDataCollectorModule: any = null;
try {
  BehavioralDataCollectorModule = requireNativeModule("DataCollection");
} catch { }

interface Permission {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  granted: boolean;
  required: boolean;
}

export default function PermissionsScreen() {
  const insets = useSafeAreaInsets();
  const setOnboardingStep = useUserStore((state) => state.setOnboardingStep);
  const { startDataCollection, requestPermissions } = useDataCollectionStore();
  const [isLoading, setIsLoading] = useState(false);

  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: "location",
      title: "Location Access",
      description: "Find nearby ATMs & branches",
      icon: MapPin,
      granted: false,
      required: true,
    },
    {
      id: "notifications",
      title: "Push Notifications",
      description: "Get alerts & updates",
      icon: Bell,
      granted: false,
      required: true,
    },
    {
      id: "contacts",
      title: "Contacts Access",
      description: "Send money to contacts",
      icon: Users,
      granted: false,
      required: false,
    },
    {
      id: "usageStats",
      title: "App Usage Access",
      description: "Fraud detection & security",
      icon: BarChart3,
      granted: false,
      required: false,
    },
  ]);

  useEffect(() => {
    checkAllPermissions();
  }, []);

  const checkAllPermissions = async () => {
    try {
      const locationStatus = await Location.getForegroundPermissionsAsync();
      const notificationStatus = await Notifications.getPermissionsAsync();
      const contactsStatus = await Contacts.getPermissionsAsync();
      let usageStatsGranted = false;
      if (BehavioralDataCollectorModule) {
        try {
          const p = await BehavioralDataCollectorModule.checkPermissions();
          usageStatsGranted = p.usageStats || false;
        } catch { }
      }
      setPermissions((prev) =>
        prev.map((permission) => {
          switch (permission.id) {
            case "location":
              return {
                ...permission,
                granted: locationStatus.status === "granted",
              };
            case "notifications":
              return {
                ...permission,
                granted: notificationStatus.status === "granted",
              };
            case "contacts":
              return {
                ...permission,
                granted: contactsStatus.status === "granted",
              };
            case "usageStats":
              return { ...permission, granted: usageStatsGranted };
            default:
              return permission;
          }
        })
      );
    } catch { }
  };

  const openUsageStatsSettings = async () => {
    try {
      await Linking.openURL("android.settings.USAGE_ACCESS_SETTINGS");
    } catch {
      await Linking.openSettings();
    }
  };

  const requestPermission = async (id: string) => {
    let granted = false;
    switch (id) {
      case "location":
        granted =
          (await Location.requestForegroundPermissionsAsync()).status ===
          "granted";
        break;
      case "notifications":
        granted =
          (await Notifications.requestPermissionsAsync()).status === "granted";
        break;
      case "contacts":
        granted =
          (await Contacts.requestPermissionsAsync()).status === "granted";
        break;
      case "usageStats":
        Alert.alert(
          "App Usage Access",
          "We’ll take you to settings to enable usage access.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: openUsageStatsSettings },
          ]
        );
        return;
    }
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, granted } : p))
    );
  };

  const handleContinue = async () => {
    const required = permissions.filter((p) => p.required);
    if (!required.every((p) => p.granted)) {
      Alert.alert(
        "Required Permissions",
        "Please grant all required permissions to continue."
      );
      return;
    }

    setIsLoading(true);
    try {
      // Navigate immediately for better UX
      setOnboardingStep("mobile-input");
      router.push("/(onboarding)/mobile-input");

      // Run heavy operations in background after navigation
      setTimeout(async () => {
        try {
          await requestPermissions();
          const { startSession } = useDataCollectionStore.getState();
          await startSession('onboarding_user');
          await startDataCollection("initial-registration");
        } catch (error) {
          console.warn('Background permission setup failed:', error);
        }
      }, 100);
    } catch (error) {
      console.error('Navigation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const allRequiredGranted = permissions
    .filter((p) => p.required)
    .every((p) => p.granted);

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      {/* Header with Back Button */}
      <View className="px-6 py-5 border-b border-zinc-800/50 mt-4">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-zinc-800/50 items-center justify-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <ArrowLeft size={20} color="#a1a1aa" />
          </Pressable>
          <Text className="text-zinc-100 text-lg font-semibold">
            Security Permissions
          </Text>
          <View className="w-10" />
        </View>
        <Text className="text-zinc-400 text-center text-sm leading-5">
          Enable these for the best banking experience and protection.
        </Text>
      </View>

      {/* Permissions List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 140, paddingTop: 20 }}
      >
        {permissions.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => requestPermission(p.id)}
            className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-5 py-4 mb-4 flex-row items-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <View className="w-12 h-12 rounded-full bg-zinc-800/50 items-center justify-center mr-4">
              <p.icon size={22} color="#a1a1aa" />
            </View>
            <View className="flex-1">
              <Text className="text-zinc-100 text-base font-semibold">
                {p.title}
              </Text>
              <Text className="text-zinc-400 text-sm">{p.description}</Text>
            </View>
            <View className="ml-3">
              {p.granted ? (
                <Check size={18} color="#22c55e" />
              ) : (
                <Text className="text-zinc-500 text-sm">Allow</Text>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Bottom Buttons */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 16,
          gap: 12,
        }}
      >
        {/* Refresh Button */}
        <Pressable
          onPress={checkAllPermissions}
          className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl py-3 mb-3"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <View className="flex-row items-center justify-center">
            <RefreshCw size={16} color="#a1a1aa" style={{ marginRight: 8 }} />
            <Text className="text-center text-sm font-medium text-zinc-300">
              Refresh Permission Status
            </Text>
          </View>
        </Pressable>

        {/* Continue Button */}
        <Pressable
          onPress={handleContinue}
          className={`rounded-xl py-4 ${allRequiredGranted ? "bg-zinc-100" : "bg-zinc-800/50 border border-zinc-700/50"
            }`}
          disabled={!allRequiredGranted || isLoading}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Text
            className={`text-center text-lg font-semibold ${allRequiredGranted ? "text-zinc-900" : "text-zinc-500"
              }`}
          >
            {isLoading ? 'Setting up...' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
