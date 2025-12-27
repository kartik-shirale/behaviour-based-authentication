import DataCollectionTextInput from '@/components/DataCollectionTextInput';
import PaymentNotification from '@/components/PaymentNotification';
import { BackButton } from '@/components/ui/BackButton';
import { useDataCollectionStore } from '@/stores/useDataCollectionStore';
import { useUserStore } from '@/stores/useUserStore';
import { router } from 'expo-router';
import { Plus, Smartphone, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, SafeAreaView, ScrollView, Share, Text, View } from 'react-native';

export default function RequestMoneyScreen() {
  const [amount, setAmount] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [note, setNote] = useState('');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [recentContacts, setRecentContacts] = useState<any[]>([]);
  const [showContacts, setShowContacts] = useState(false);
  const [showPaymentNotification, setShowPaymentNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<any>(null);
  const { user, transactions } = useUserStore();
  const { startDataCollection, isCollecting, collectionScenario } = useDataCollectionStore();

  // Start data collection when screen loads
  useEffect(() => {
    const initializeDataCollection = async () => {
      if (!isCollecting && !collectionScenario) {
        try {
          await startDataCollection('login');
        } catch (error) {
          // Failed to start data collection
        }
      }
    };

    initializeDataCollection();
  }, [isCollecting, collectionScenario, startDataCollection]);

  const quickAmounts = [500, 1000, 2000, 5000];

  // Get recent contacts from transaction history
  useEffect(() => {
    const loadRecentContactsWithNames = async () => {
      if (transactions && transactions.length > 0) {
        const { findUserByMobile } = useUserStore.getState();
        const contactsPromises = transactions
          .filter(tx => tx.type === 'transfer' && tx.toMobile)
          .reduce((acc: any[], tx) => {
            const existing = acc.find(c => c.mobile === tx.toMobile);
            if (!existing && tx.toMobile !== user?.mobile) {
              acc.push(tx);
            }
            return acc;
          }, [])
          .slice(0, 4) // Show only 4 recent contacts
          .map(async (tx) => {
            // Try to find user in database to get actual name
            const recipientUser = await findUserByMobile(tx.toMobile);
            const displayName = recipientUser?.fullName || tx.recipient?.name || 'Unknown';

            return {
              id: tx.toUserId || tx.toMobile,
              name: displayName,
              mobile: tx.toMobile,
              avatar: recipientUser?.profile || displayName.split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2)
            };
          });

        const contacts = await Promise.all(contactsPromises);
        setRecentContacts(contacts);
      }
    };

    loadRecentContactsWithNames();
  }, [transactions, user?.mobile]);

  const formatCurrency = (value: string | number) => {
    const numericValue = typeof value === 'string' ? parseInt(value) : value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(numericValue).replace('₹', '').replace(/,/g, '');
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleContactSelect = (contact: any) => {
    setSelectedContact(contact);
    setMobileNumber(contact.mobile.replace(/\s/g, ''));
  };

  const validateInputs = () => {
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return false;
    }
    if (!mobileNumber || mobileNumber.length < 10) {
      Alert.alert('Invalid Mobile Number', 'Please enter a valid mobile number');
      return false;
    }
    return true;
  };

  const generatePaymentLink = () => {
    const requestId = Date.now().toString();
    const paymentLink = `https://securebank.app/pay?req=${requestId}&amt=${amount}&to=${user?.mobile || ''}&note=${encodeURIComponent(note)}`;
    return { requestId, paymentLink };
  };

  const handleSendRequest = async () => {
    if (!validateInputs()) return;

    const { requestId, paymentLink } = generatePaymentLink();
    const recipientName = selectedContact?.name || 'Unknown';

    try {
      const message = `💰 Payment Request\n\nHi ${recipientName}!\n\n${user?.fullName || 'Someone'} has requested ${formatCurrency(amount)} from you.\n\n${note ? `Note: ${note}\n\n` : ''}Pay securely using this link:\n${paymentLink}\n\nRequest ID: ${requestId}\n\nSent via SecureBank App`;

      await Share.share({
        message,
        title: 'Payment Request'
      });

      // Show success notification
      setNotificationData({
        type: 'success',
        amount: formatCurrency(amount),
        recipientName,
        recipientMobile: selectedContact?.mobile || mobileNumber,
        transactionId: requestId,
        message: `Payment request sent successfully to ${recipientName}`,
        recipientFound: !!selectedContact
      });
      setShowPaymentNotification(true);
    } catch (error) {
      // Show error notification
      setNotificationData({
        type: 'error',
        amount: formatCurrency(amount),
        recipientName,
        recipientMobile: selectedContact?.mobile || mobileNumber,
        transactionId: '',
        message: 'Failed to send payment request. Please try again.',
        recipientFound: !!selectedContact
      });
      setShowPaymentNotification(true);
    }
  };

  const handleGenerateQR = () => {
    if (!validateInputs()) return;

    const { requestId, paymentLink } = generatePaymentLink();

    router.push({
      pathname: '/(app)/payment-qr',
      params: {
        amount,
        note,
        requestId,
        paymentLink,
        type: 'request'
      }
    });
  };

  const handleNotificationClose = () => {
    setShowPaymentNotification(false);
    setNotificationData(null);
    if (notificationData?.type === 'success') {
      // Reset form for successful requests
      setAmount('');
      setMobileNumber('');
      setNote('');
      setSelectedContact(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView behavior='height' className="flex-1">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}>
          <View className="flex-1 px-5 py-6">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-8 mt-3">
              <View className="flex-row items-center">
                <BackButton />
                <Text className="text-xl font-semibold text-white ml-4">Request Money</Text>
              </View>
            </View>

            {/* Amount Section */}
            <View className="mb-6">
              <Text className="text-white text-base font-semibold mb-4">Amount</Text>
              <View className="bg-zinc-900/70 rounded-2xl p-6 border border-zinc-800/50">
                <View className="items-center">
                  <Text className="text-zinc-400 text-lg mb-2">₹</Text>
                  <DataCollectionTextInput
                    value={amount ? formatCurrency(amount) : ''}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, '');
                      setAmount(numericValue);
                    }}
                    placeholder="0"
                    placeholderTextColor="#52525B"
                    className="text-white text-4xl font-light text-center w-full"
                    keyboardType="numeric"
                    inputType="amount"
                    style={{ textAlign: 'center' }}
                  />
                </View>
              </View>

              {/* Quick Amount Buttons */}
              <View className="flex-row justify-between mt-4 space-x-2">
                {quickAmounts.map((quickAmount, index) => {
                  const isSelected = amount === quickAmount.toString();
                  return (
                    <Pressable
                      key={quickAmount}
                      onPress={() => setAmount(quickAmount.toString())}
                      className={`flex-1 rounded-xl py-3 px-2 border ${isSelected
                        ? 'bg-blue-600 border-blue-500'
                        : 'bg-zinc-900/70 border-zinc-800/50'
                        } ${index > 0 ? 'ml-2' : ''}`}
                    >
                      <Text className={`text-sm text-center font-medium ${isSelected ? 'text-white' : 'text-zinc-300'
                        }`}>
                        ₹{formatCurrency(quickAmount.toString())}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Recipient Section */}
            <View className="mb-6">
              <Text className="text-white text-base font-semibold mb-4">Request From</Text>

              {selectedContact ? (
                <View className="bg-zinc-900/70 rounded-2xl p-4 border border-zinc-800/50">
                  <View className="flex-row items-center">
                    <View className="w-12 h-12 bg-blue-600 rounded-full items-center justify-center mr-4">
                      <Text className="text-white font-bold text-base">
                        {selectedContact.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-medium text-base">{selectedContact.name}</Text>
                      <Text className="text-zinc-400 text-sm">{selectedContact.mobile}</Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setSelectedContact(null);
                        setMobileNumber('');
                      }}
                      className="px-3 py-1 bg-zinc-800 rounded-lg"
                    >
                      <Text className="text-zinc-300 text-xs font-medium">Change</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View className="bg-zinc-900/70 rounded-2xl border border-zinc-800/50">
                  <View className="flex-row items-center p-4">
                    <View className="w-12 h-12 bg-zinc-800 rounded-full items-center justify-center mr-4">
                      <Smartphone size={18} color="#71717A" />
                    </View>
                    <View className="flex-1">
                      <DataCollectionTextInput
                        value={mobileNumber}
                        onChangeText={setMobileNumber}
                        placeholder="Enter mobile number"
                        placeholderTextColor="#71717A"
                        className="text-white text-base"
                        keyboardType="phone-pad"
                        maxLength={25000}
                        numberOfLines={2000}
                        inputType="mobile"
                      />
                    </View>
                  </View>
                </View>
              )}

              {!selectedContact && (
                <Pressable
                  onPress={() => setShowContacts(!showContacts)}
                  className="mt-3 flex-row items-center"
                >
                  <Plus size={14} color="#3B82F6" />
                  <Text className="text-blue-400 text-sm font-medium ml-1">Choose from contacts</Text>
                </Pressable>
              )}
            </View>

            {/* Recent Contacts */}
            {showContacts && !selectedContact && (
              <View className="mb-6">
                <Text className="text-white text-base font-semibold mb-4">Recent Contacts</Text>
                {recentContacts.length > 0 ? (
                  <View className="bg-zinc-900/70 rounded-2xl border border-zinc-800/50 overflow-hidden">
                    {recentContacts.map((contact, index) => (
                      <Pressable
                        key={contact.id}
                        onPress={() => handleContactSelect(contact)}
                        className={`p-4 ${index < recentContacts.length - 1 ? 'border-b border-zinc-800/50' : ''}`}
                      >
                        <View className="flex-row items-center">
                          <View className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center mr-3">
                            <Text className="text-white font-bold text-sm">
                              {contact.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-white font-medium">{contact.name}</Text>
                            <Text className="text-zinc-400 text-sm">{contact.mobile}</Text>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View className="bg-zinc-900/70 rounded-2xl p-8 items-center border border-zinc-800/50">
                    <View className="w-16 h-16 bg-zinc-800 rounded-full items-center justify-center mb-3">
                      <User size={24} color="#71717A" />
                    </View>
                    <Text className="text-zinc-400 text-center font-medium">No recent contacts</Text>
                    <Text className="text-zinc-500 text-sm text-center mt-1">
                      Your recent requests will appear here
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Note Section */}
            <View className="mb-6">
              <Text className="text-white text-base font-semibold mb-4">Add Note (Optional)</Text>
              <View className="bg-zinc-900/70 rounded-2xl p-4 border border-zinc-800/50">
                <DataCollectionTextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="What's this request for?"
                  placeholderTextColor="#71717A"
                  className="text-white text-base"
                  multiline
                  numberOfLines={2}
                  maxLength={25000}
                  inputType="text"
                />
              </View>
            </View>

            {/* Request Methods */}
            <View className="bg-zinc-900/70 rounded-2xl p-6 mb-8 border border-zinc-800/50">
              <Text className="text-white text-base font-semibold mb-4">Request Methods</Text>

              <Pressable
                onPress={handleSendRequest}
                className="flex-row items-center py-4 px-4 bg-zinc-800/50 rounded-xl mb-3 border border-zinc-700/50"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View className="w-12 h-12 bg-blue-600 rounded-full items-center justify-center mr-4">
                  <Text className="text-white text-xl">💬</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold">Send via Message</Text>
                  <Text className="text-zinc-400 text-sm">Share payment link via SMS/WhatsApp</Text>
                </View>
                <Text className="text-zinc-400 text-xl">›</Text>
              </Pressable>

              <Pressable
                onPress={handleGenerateQR}
                className="flex-row items-center py-4 px-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50"
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View className="w-12 h-12 bg-green-600 rounded-full items-center justify-center mr-4">
                  <Text className="text-white text-xl">📱</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold">Generate QR Code</Text>
                  <Text className="text-zinc-400 text-sm">Let others scan to pay you</Text>
                </View>
                <Text className="text-zinc-400 text-xl">›</Text>
              </Pressable>
            </View>

            {/* Info Card */}
            <View className="bg-zinc-950 rounded-2xl p-4 mb-6 border border-zinc-800/30">
              <View className="flex-row items-start">
                <Text className="text-blue-400 text-lg mr-2">ℹ️</Text>
                <View className="flex-1">
                  <Text className="text-blue-400 font-semibold mb-1">How it works</Text>
                  <Text className="text-zinc-400 text-sm">
                    Send a payment request to anyone. They can pay you instantly using the secure link or QR code.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View className="px-5 pb-8 pt-4 border-t border-zinc-800/50">
          <Pressable
            onPress={() => {
              if (amount && mobileNumber) {
                // Show request methods or handle continue action
              }
            }}
            className={`rounded-2xl py-4 px-6 ${amount && mobileNumber ? 'bg-white' : 'bg-zinc-800'
              }`}
            disabled={!amount || !mobileNumber}
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text className={`text-center text-lg font-semibold ${amount && mobileNumber ? 'text-black' : 'text-zinc-500'
              }`}>
              Continue
            </Text>
          </Pressable>
        </View>

        {/* Payment Notification */}
        {notificationData && (
          <PaymentNotification
            visible={showPaymentNotification}
            onClose={handleNotificationClose}
            type={notificationData.type}
            amount={notificationData.amount}
            recipientName={notificationData.recipientName}
            recipientMobile={notificationData.recipientMobile}
            transactionId={notificationData.transactionId}
            message={notificationData.message}
            recipientFound={notificationData.recipientFound}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}