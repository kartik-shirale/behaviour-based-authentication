import { BackButton } from '@/components/ui/BackButton';
import { useUserStore } from '@/stores/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Award,
  BarChart3,
  Building2,
  Calculator,
  Car,
  ChevronRight,
  Clipboard,
  CreditCard,
  DollarSign,
  FileCheck,
  FileText,
  Gem,
  Globe,
  HelpCircle,
  Hospital,
  MessageCircle, Phone,
  Plane,
  Receipt, RotateCcw,
  Send,
  Shield,
  Smartphone,
  TrafficCone,
  TrendingUp,
  Users
} from 'lucide-react-native';
import React from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

interface Service {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  route?: string;
  comingSoon?: boolean;
}

export default function MoreServicesScreen() {
  const { user } = useUserStore();

  const bankingServices: Service[] = [
    {
      id: 'beneficiary',
      title: 'Manage Beneficiaries',
      description: 'Add, edit or remove beneficiaries',
      icon: Users,
      color: 'bg-blue-500',
      route: '/(app)/beneficiary-list'
    },
    {
      id: 'statements',
      title: 'Account Statements',
      description: 'Download monthly statements',
      icon: FileText,
      color: 'bg-green-500',
      comingSoon: true
    },
    {
      id: 'cheque',
      title: 'Cheque Book Request',
      description: 'Request new cheque book',
      icon: Clipboard,
      color: 'bg-purple-500',
      comingSoon: true
    },
    {
      id: 'fd',
      title: 'Fixed Deposits',
      description: 'Create and manage FDs',
      icon: Building2,
      color: 'bg-orange-500',
      comingSoon: true
    }
  ];

  const paymentServices: Service[] = [
    {
      id: 'qr_pay',
      title: 'QR Code Payment',
      description: 'Scan and pay with QR codes',
      icon: Smartphone,
      color: 'bg-indigo-500',
      comingSoon: true
    },
    {
      id: 'split_bill',
      title: 'Split Bills',
      description: 'Split expenses with friends',
      icon: Receipt,
      color: 'bg-pink-500',
      comingSoon: true
    },
    {
      id: 'recurring',
      title: 'Recurring Payments',
      description: 'Set up automatic payments',
      icon: RotateCcw,
      color: 'bg-teal-500',
      comingSoon: true
    },
    {
      id: 'international',
      title: 'International Transfer',
      description: 'Send money abroad',
      icon: Globe,
      color: 'bg-cyan-500',
      comingSoon: true
    }
  ];

  const investmentServices: Service[] = [
    {
      id: 'mutual_funds',
      title: 'Mutual Funds',
      description: 'Invest in mutual funds',
      icon: TrendingUp,
      color: 'bg-emerald-500',
      comingSoon: true
    },
    {
      id: 'stocks',
      title: 'Stock Trading',
      description: 'Buy and sell stocks',
      icon: BarChart3,
      color: 'bg-red-500',
      comingSoon: true
    },
    {
      id: 'gold',
      title: 'Digital Gold',
      description: 'Buy and sell digital gold',
      icon: Award,
      color: 'bg-yellow-500',
      comingSoon: true
    },
    {
      id: 'sip',
      title: 'SIP Calculator',
      description: 'Calculate SIP returns',
      icon: Calculator,
      color: 'bg-violet-500',
      comingSoon: true
    }
  ];

  const insuranceServices: Service[] = [
    {
      id: 'life_insurance',
      title: 'Life Insurance',
      description: 'Protect your family',
      icon: Shield,
      color: 'bg-blue-600',
      comingSoon: true
    },
    {
      id: 'health_insurance',
      title: 'Health Insurance',
      description: 'Medical coverage plans',
      icon: Hospital,
      color: 'bg-red-600',
      comingSoon: true
    },
    {
      id: 'vehicle_insurance',
      title: 'Vehicle Insurance',
      description: 'Car and bike insurance',
      icon: Car,
      color: 'bg-gray-600',
      comingSoon: true
    },
    {
      id: 'travel_insurance',
      title: 'Travel Insurance',
      description: 'Safe travel coverage',
      icon: Plane,
      color: 'bg-sky-500',
      comingSoon: true
    }
  ];

  const utilityServices: Service[] = [
    {
      id: 'loan_emi',
      title: 'Loan EMI',
      description: 'Pay loan installments',
      icon: CreditCard,
      color: 'bg-amber-500',
      comingSoon: true
    },
    {
      id: 'credit_card',
      title: 'Credit Card Bills',
      description: 'Pay credit card dues',
      icon: Gem,
      color: 'bg-slate-500',
      comingSoon: true
    },
    {
      id: 'tax_payment',
      title: 'Tax Payments',
      description: 'Pay income tax online',
      icon: FileCheck,
      color: 'bg-lime-500',
      comingSoon: true
    },
    {
      id: 'challan',
      title: 'Traffic Challan',
      description: 'Pay traffic fines',
      icon: TrafficCone,
      color: 'bg-rose-500',
      comingSoon: true
    }
  ];

  const handleServicePress = (service: Service) => {
    if (service.comingSoon) {
      // Show coming soon message
      return;
    }

    if (service.route) {
      router.push(service.route as any);
    }
  };

  const renderServiceSection = (title: string, services: Service[]) => (
    <View className="mb-8">
      <Text className="text-white text-xl font-bold mb-4">{title}</Text>
      <View className="flex-row flex-wrap gap-3">
        {services.map((service) => (
          <Pressable
            key={service.id}
            onPress={() => handleServicePress(service)}
            className="bg-zinc-900/70 rounded-2xl p-4 border border-zinc-800/50 flex-1 min-w-[45%] relative"
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {service.comingSoon && (
              <View className="absolute top-2 right-2 bg-red-500 px-1 py-1/2 rounded-full">

                <Text className="text-black text-[8px] font-bold">soon</Text>
              </View>
            )}
            <View className={`w-12 h-12 ${service.color} rounded-full items-center justify-center mb-3`}>
              <service.icon size={24} color="white" />
            </View>
            <Text className="text-white font-semibold mb-1" numberOfLines={1}>
              {service.title}
            </Text>
            <Text className="text-white/60 text-sm" numberOfLines={2}>
              {service.description}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      className="flex-1"
    >
      <SafeAreaView className="flex-1 bg-black">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="flex-1 px-6 py-6">
            {/* Header */}
            <View className="flex-row items-center mb-8">
              <BackButton className="mr-4" />
              <Text className="text-2xl font-bold text-white">More Services</Text>
            </View>

            {/* User Welcome */}
            <View className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl p-6 mb-8 border border-zinc-800/50">
              <Text className="text-white text-lg font-semibold mb-2">
                Welcome, {user?.fullName || 'User'}!
              </Text>
              <Text className="text-white/70 text-sm">
                Explore our comprehensive banking and financial services designed to make your life easier.
              </Text>
            </View>

            {/* Quick Actions */}
            <View className="mb-8">
              <Text className="text-white text-xl font-bold mb-4">Quick Actions</Text>
              <View className="flex-row gap-3 justify-between">
                <Pressable
                  onPress={() => router.push('/(app)/send-money')}
                  className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-4  items-center flex gap-2 flex-row"

                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Send size={20} color="white" />
                  <Text className="text-white text-base font-bold">Send</Text>

                </Pressable>

                <Pressable
                  onPress={() => router.push('/(app)/send-money')}
                  className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-4  items-center flex gap-2 flex-row"

                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <DollarSign size={20} color="white" />
                  <Text className="text-white text-base font-bold">Request</Text>

                </Pressable>

                <Pressable
                  onPress={() => router.push('/(app)/send-money')}
                  className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-4  items-center flex gap-2 flex-row"

                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <BarChart3 size={20} color="white" />
                  <Text className="text-white text-base font-bold">History</Text>
                </Pressable>
              </View>
            </View>

            {/* Service Sections */}
            {renderServiceSection('Banking Services', bankingServices)}
            {renderServiceSection('Payment Services', paymentServices)}
            {renderServiceSection('Investment Services', investmentServices)}
            {renderServiceSection('Insurance Services', insuranceServices)}
            {renderServiceSection('Utility Services', utilityServices)}

            {/* Help & Support */}
            <View className="bg-zinc-900/70 rounded-2xl p-6 mb-8 border border-zinc-800/50">
              <Text className="text-white text-lg font-semibold mb-4">Need Help?</Text>
              <View className="space-y-3">
                <Pressable
                  className="flex-row items-center py-3"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View className="w-10 h-10 bg-green-500 rounded-full items-center justify-center mr-3">
                    <MessageCircle size={20} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">Live Chat Support</Text>
                    <Text className="text-white/60 text-sm">Get instant help from our team</Text>
                  </View>
                  <ChevronRight size={20} color="rgba(255,255,255,0.4)" />
                </Pressable>

                <Pressable
                  className="flex-row items-center py-3"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View className="w-10 h-10 bg-blue-500 rounded-full items-center justify-center mr-3">
                    <Phone size={20} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">Call Support</Text>
                    <Text className="text-white/60 text-sm">1800-XXX-XXXX (Toll Free)</Text>
                  </View>
                  <ChevronRight size={20} color="rgba(255,255,255,0.4)" />
                </Pressable>

                <Pressable
                  className="flex-row items-center py-3"
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View className="w-10 h-10 bg-purple-500 rounded-full items-center justify-center mr-3">
                    <HelpCircle size={20} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-medium">FAQ</Text>
                    <Text className="text-white/60 text-sm">Find answers to common questions</Text>
                  </View>
                  <ChevronRight size={20} color="rgba(255,255,255,0.4)" />
                </Pressable>
              </View>
            </View>

            {/* App Info */}
            <View className="bg-zinc-900/70 rounded-2xl p-6 border border-zinc-800/50">
              <Text className="text-white text-lg font-semibold mb-2">SecureBank Mobile</Text>
              <Text className="text-white/60 text-sm mb-4">
                Your trusted banking partner with cutting-edge security and user-friendly features.
              </Text>
              <View className="flex-row justify-between">
                <Text className="text-white/40 text-xs">Version 1.0.0</Text>
                <Text className="text-white/40 text-xs">© 2024 SecureBank</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}