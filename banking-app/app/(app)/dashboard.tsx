import { TouchTrackingWrapper } from '@/components/TouchTrackingWrapper';
import { useDataCollectionStore } from '@/stores/useDataCollectionStore';
import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import { ArrowDownToLine, BarChart3, CreditCard, Eye, EyeOff, Send, User } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Image, Pressable, RefreshControl, SafeAreaView, ScrollView, Text, View } from 'react-native';

export default function DashboardScreen() {
  const { user, transactions, fetchTransactions, subscribeToTransactions, subscribeToBalance, refreshUserData, findUserByMobile } = useUserStore();
  const { startSession, startDataCollection, handleAppStateChange, collectionScenario, currentSession } = useDataCollectionStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [transactionUsers, setTransactionUsers] = useState<Record<string, any>>({});
  const hasDataBeenSentRef = useRef(false);

  useEffect(() => {
    // Subscribe to real-time updates
    subscribeToTransactions();
    subscribeToBalance();

    // Fetch initial data
    fetchTransactions();

    // Only start data collection when user actively interacts with the dashboard
    // This ensures we don't collect data without meaningful user engagement
  }, []);

  useEffect(() => {
    const sendDataOnce = async (reason: string) => {
      if (hasDataBeenSentRef.current) {
        console.log(`🔴 Data already sent, skipping ${reason}`);
        return;
      }

      try {
        console.log(`🔴 Sending data due to: ${reason}`);
        await useDataCollectionStore.getState().endSessionAndSendData('/api/data/regular');
        hasDataBeenSentRef.current = true;
      } catch (error) {
        console.log(`🔴 Failed to send data on ${reason}:`, error);
      }
    };

    // Handle app state changes for data collection
    const handleAppStateChangeWrapper = (nextAppState: string) => {
      handleAppStateChange(nextAppState);

      // Send data when app goes to background (only if sufficient data collected)
      if (nextAppState === 'background' && collectionScenario === 'login') {
        sendDataOnce('app background');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChangeWrapper);

    return () => {
      subscription?.remove();
      // Only send data on unmount if it's a login scenario and data hasn't been sent yet
      if (collectionScenario === 'login') {
        sendDataOnce('component unmount');
      }
    };
  }, [collectionScenario]);



  // Get recent transactions from store (limit to 3 for dashboard)
  const recentTransactions = transactions.slice(0, 3);

  // Load user data for transactions
  useEffect(() => {
    const loadTransactionUsers = async () => {
      const userCache: Record<string, any> = {};

      for (const transaction of recentTransactions) {
        const otherUserMobile = transaction.type === 'credit' ? transaction.fromMobile : transaction.toMobile;

        if (otherUserMobile && otherUserMobile !== user?.mobile && !userCache[otherUserMobile]) {
          try {
            const otherUser = await findUserByMobile(otherUserMobile);
            if (otherUser) {
              userCache[otherUserMobile] = otherUser;
            }
          } catch (error) {
            console.log('Failed to load user for mobile:', otherUserMobile);
          }
        }
      }

      setTransactionUsers(userCache);
    };

    if (recentTransactions.length > 0) {
      loadTransactionUsers();
    }
  }, [recentTransactions, user?.mobile]);

  // Helper function to get user avatar
  const getUserAvatar = (transaction: any) => {
    const otherUserMobile = transaction.type === 'credit' ? transaction.fromMobile : transaction.toMobile;
    const otherUser = transactionUsers[otherUserMobile];

    if (otherUser?.profile) {
      return (
        <Image
          source={{ uri: otherUser.profile }}
          className="w-full h-full rounded-full"
          style={{ resizeMode: 'cover' }}
        />
      );
    }

    // Generate avatar from name
    const displayName = otherUser?.fullName || transaction.recipient?.name || 'Unknown';
    const initials = displayName.split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
      <View className="w-full h-full rounded-full bg-purple-600/30 items-center justify-center">
        <Text className="text-white text-sm font-bold">{initials}</Text>
      </View>
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchTransactions(),
        refreshUserData()
      ]);
    } catch (error) {
      // Failed to refresh data
    } finally {
      setIsRefreshing(false);
    }
  };

  // Start data collection on first meaningful user interaction
  const handleUserInteraction = async () => {
    console.log("🟡 User interaction detected:", {
      hasCollectionScenario: !!collectionScenario,
      hasCurrentSession: !!currentSession,
      userId: user?.uid || 'dashboard_user'
    });

    if (!currentSession) {
      // First start a session, then start data collection
      await startSession(user?.uid || 'dashboard_user');
      await startDataCollection('login');
    } else if (!collectionScenario) {
      await startDataCollection('login');
    } else {
      console.log("🟡 Session and data collection already active");
    }
  };



  return (
    <SafeAreaView className="flex-1 bg-black">
      <TouchTrackingWrapper className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          onTouchStart={handleUserInteraction}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#8B5CF6"
              colors={['#8B5CF6']}
            />
          }
        >
          {/* Header */}
          <View className="px-6 py-8">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-gray-400 text-sm">Good Morning</Text>
                <Text className="text-white text-xl font-bold">{user?.fullName || 'User'}</Text>
              </View>
              <Pressable
                onPress={() => router.push('/(app)/profile')}
                className="w-10 h-10 bg-zinc-900/70 border border-zinc-800/50 rounded-full items-center justify-center overflow-hidden"
              >
                {user?.profile ? (
                  <Image
                    source={{ uri: user.profile }}
                    className="w-full h-full"
                    style={{ resizeMode: 'cover' }}
                  />
                ) : (
                  <User size={20} color="white" />
                )}
              </Pressable>
            </View>

            {/* Balance Display */}
            <View className="items-center mb-8">
              <View className="flex-row items-center mb-2">
                <View className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                <View className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                <View className="w-2 h-2 bg-purple-500 rounded-full mr-2" />
                <View className="w-2 h-2 bg-purple-500 rounded-full" />
              </View>
              <View className="flex-row items-center mb-1">
                <Text className="text-white text-4xl font-bold">
                  {balanceVisible ? `₹${(user?.balance || 1250.00).toFixed(2)}` : '₹••••••'}
                </Text>
                <Pressable
                  onPress={() => setBalanceVisible(!balanceVisible)}
                  className="ml-3 bg-zinc-900/70 border border-zinc-800/50 rounded-full p-2"
                >
                  {balanceVisible ? <Eye size={16} color="white" /> : <EyeOff size={16} color="white" />}
                </Pressable>
              </View>
              <Text className="text-gray-400 text-sm">Available Balance</Text>
              {isRefreshing && (
                <Text className="text-gray-400 text-xs mt-1">Updating...</Text>
              )}
            </View>

            {/* Action Buttons */}
            <View className="flex-row justify-center  gap-2 mb-8">
              <Pressable
                onPress={() => router.push('/(app)/send-money')}
                className="bg-zinc-900/70 border border-zinc-800/50 rounded-full px-6 py-3"
              >
                <Text className="text-white font-medium">Send</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(app)/request-money')}
                className="bg-zinc-900/70 border border-zinc-800/50 rounded-full px-6 py-3"
              >
                <Text className="text-white font-medium">Request</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(app)/more-services')}
                className="bg-zinc-900/70 border border-zinc-800/50 rounded-full px-6 py-3"
              >
                <Text className="text-white font-medium">More</Text>
              </Pressable>
            </View>
          </View>



          {/* Send Money */}
          <View className="px-6 pb-8">
            <Text className="text-white text-lg font-bold mb-4">Quick Send</Text>
            <View className="flex-row justify-between">
              <Pressable
                onPress={() => router.push('/(app)/send-money')}
                className="bg-purple-600 rounded-2xl p-6 flex-1 mr-2 items-center"
              >
                <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mb-2">
                  <Send size={24} color="white" />
                </View>
                <Text className="text-white text-sm font-medium">Send Money</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(app)/request-money')}
                className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-6 flex-1 ml-2 items-center"
              >
                <View className="w-12 h-12 bg-purple-500/20 rounded-full items-center justify-center mb-2">
                  <ArrowDownToLine size={24} color="#a855f7" />
                </View>
                <Text className="text-white text-sm font-medium">Request Money</Text>
              </Pressable>
            </View>
          </View>
          {/* My Card Section */}
          <View className="px-6 mb-6">
            <Text className="text-white text-lg font-bold mb-4">My Card</Text>

            {user?.accountNumber ? (
              <Pressable
                onPress={() => router.push('/(app)/my-card')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 mb-4"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white text-lg font-bold mb-1">Virtual Debit Card</Text>
                    <Text className="text-white/80 text-sm mb-3">
                      {balanceVisible ? '•••• •••• •••• 9012' : '•••• •••• •••• ••••'}
                    </Text>
                    <Text className="text-white/60 text-xs">Tap to view card details</Text>
                  </View>
                  <View className="items-end">
                    <View className="w-12 h-8 bg-white/20 rounded-lg items-center justify-center mb-2">
                      <Text className="text-white text-xs font-bold">VISA</Text>
                    </View>
                    <Text className="text-white/80 text-sm">12/28</Text>
                    <View className={`mt-1 px-2 py-1 rounded-full ${(user?.balance || 0) > 1000 ? 'bg-green-600/20' : 'bg-yellow-600/20'
                      }`}>
                      <Text className={`text-xs ${(user?.balance || 0) > 1000 ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                        {(user?.balance || 0) > 1000 ? 'Active' : 'Low Balance'}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ) : (
              <View className="bg-zinc-900/70 border-2 border-dashed border-zinc-800/50 rounded-2xl p-6 items-center mb-4">
                <View className="w-12 h-12 bg-zinc-700/50 rounded-full items-center justify-center mb-3">
                  <CreditCard size={24} color="#9ca3af" />
                </View>
                <Text className="text-white font-medium text-center mb-2">
                  No Virtual Card
                </Text>
                <Text className="text-gray-400 text-sm text-center mb-4">
                  Create a virtual card to make online payments securely
                </Text>
                <Pressable className="bg-purple-600 px-6 py-2 rounded-xl">
                  <Text className="text-white font-medium">Create Card</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Recent Transactions */}
          <View className="px-6 pb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-bold">Recent Activity</Text>
              <Pressable onPress={() => router.push('/(app)/transactions')}>
                <Text className="text-purple-400 text-sm">View All</Text>
              </Pressable>
            </View>

            {recentTransactions.length > 0 ? (
              <View className="space-y-3 gap-2">
                {recentTransactions.map((transaction, index) => (
                  <View key={transaction.id} className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 rounded-full mr-3 overflow-hidden">
                          {getUserAvatar(transaction)}
                        </View>
                        <View className="flex-1">
                          <Text className="text-white font-medium">
                            {transaction.description}
                          </Text>
                          <View className="flex-row items-center">
                            <Text className="text-gray-400 text-sm">
                              {transaction.createdAt ?
                                new Date(transaction.createdAt.toDate ? transaction.createdAt.toDate() : transaction.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                                new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              }
                            </Text>
                            <View className={`ml-2 px-2 py-1 rounded-full ${transaction.status === 'completed' ? 'bg-green-600/20' :
                              transaction.status === 'pending' ? 'bg-yellow-600/20' : 'bg-red-600/20'
                              }`}>
                              <Text className={`text-xs ${transaction.status === 'completed' ? 'text-green-400' :
                                transaction.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                {transaction.status}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <Text className={`font-bold ${transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {balanceVisible ?
                          `${transaction.type === 'credit' ? '+' : '-'}₹${transaction.amount}` :
                          `${transaction.type === 'credit' ? '+' : '-'}₹•••`
                        }
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-zinc-900/70 border border-zinc-800/50 rounded-2xl p-8 items-center">
                <View className="w-16 h-16 bg-zinc-700/50 rounded-full items-center justify-center mb-4">
                  <BarChart3 size={32} color="#9ca3af" />
                </View>
                <Text className="text-white font-medium text-center mb-2">
                  No Transactions Yet
                </Text>
                <Text className="text-gray-400 text-sm text-center mb-4">
                  Your transaction history will appear here once you start making payments
                </Text>
                <Pressable
                  onPress={() => router.push('/(app)/send-money')}
                  className="bg-purple-600 px-6 py-2 rounded-xl"
                >
                  <Text className="text-white font-medium">Send Money</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Quick Send */}

        </ScrollView>
      </TouchTrackingWrapper>
    </SafeAreaView>
  );
}