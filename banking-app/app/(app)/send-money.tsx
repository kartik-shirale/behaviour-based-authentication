import DataCollectionTextInput from '@/components/DataCollectionTextInput';
import PaymentNotification from '@/components/PaymentNotification';
import PinVerification from '@/components/PinVerification';
import { useDataCollectionStore } from '@/stores/useDataCollectionStore';
import { useUserStore } from '@/stores/useUserStore';
import * as Notifications from 'expo-notifications';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Eye, Plus, Smartphone, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface Contact {
  id: string;
  name: string;
  mobile: string;
  avatar?: string;
}

export default function SendMoneyScreen() {
  const { user, processTransaction, findUserByMobile, refreshUserData } = useUserStore();
  const { startDataCollection, isCollecting, collectionScenario } = useDataCollectionStore();
  const params = useLocalSearchParams();
  const [amount, setAmount] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [note, setNote] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContacts, setShowContacts] = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; mobile?: string; general?: string }>({});
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [showBalance, setShowBalance] = useState(true);
  const [showPaymentNotification, setShowPaymentNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<{
    type: 'success' | 'failed';
    amount: string;
    recipientName: string;
    recipientMobile: string;
    transactionId?: string;
    message?: string;
    recipientFound?: boolean;
  } | null>(null);

  // Handle QR code parameters and start data collection
  useEffect(() => {
    if (params.recipientMobile) {
      setMobileNumber(params.recipientMobile as string);
    }
    if (params.recipientName) {
      setSelectedContact({
        id: 'qr-contact',
        name: params.recipientName as string,
        mobile: params.recipientMobile as string
      });
    }
  }, [params]);

  // Start data collection when screen loads (only once)
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
  }, []); // Empty dependency array to run only once

  // Recent contacts will be loaded from database
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue === '') return '';
    return new Intl.NumberFormat('en-IN').format(parseInt(numericValue));
  };

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setAmount(numericValue);
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setMobileNumber(contact.mobile);
    setShowContacts(false);
  };

  const handleContinue = () => {
    if (validateForm()) {
      setShowPinVerification(true);
    }
  };

  const sendNotification = async (title: string, body: string, data?: any) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null,
      });
    } catch (error) {
      // Failed to send notification
    }
  };

  const handlePinSuccess = async () => {
    setIsProcessing(true);
    setPaymentStatus('processing');
    setShowPinVerification(false);

    try {
      const transactionAmount = parseInt(amount);
      // Check if user has sufficient balance
      if (transactionAmount > (user?.balance ?? 0)) {
        throw new Error('Insufficient balance');
      }

      // Ensure mobile number has +91 prefix
      const cleanMobileNumber = mobileNumber.replace(/[^0-9]/g, '');
      const formattedMobileNumber = cleanMobileNumber.startsWith('91') ? `+${cleanMobileNumber}` : `+91${cleanMobileNumber}`;

      // Find recipient user
      const recipientUser = await findUserByMobile(formattedMobileNumber);

      // Determine recipient name - prioritize database user name, then selected contact, then 'Unknown'
      const recipientName = recipientUser?.fullName || selectedContact?.name || 'Unknown';

      // Process the transaction through Firebase
      const transactionRef = await processTransaction({
        fromMobile: user?.mobile || '',
        toMobile: formattedMobileNumber,
        toUserId: recipientUser?.uid,
        type: 'transfer',
        amount: transactionAmount,
        description: recipientUser ? `Sent to ${recipientName}` : `Sent to ${formattedMobileNumber} (Recipient not found)`,
        ...(note && note.trim() ? { note: note.trim() } : {}),
        status: 'pending',
        reference: `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        category: 'transfer',
        recipient: {
          name: recipientName,
          mobile: formattedMobileNumber,
          accountNumber: recipientUser?.accountNumber || 'N/A'
        }
      });

      // Refresh user data to update balance
      await refreshUserData();

      setPaymentStatus('success');

      // Send success notification
      const notificationMessage = recipientUser
        ? `₹${formatCurrency(amount)} sent to ${recipientName}`
        : `₹${formatCurrency(amount)} sent to ${formattedMobileNumber} (Recipient not in system)`;

      await sendNotification(
        'Payment Processed! 🎉',
        notificationMessage,
        { transactionRef, amount: transactionAmount, recipient: recipientName, recipientFound: !!recipientUser }
      );

      // Show success notification
      setNotificationData({
        type: 'success',
        amount,
        recipientName,
        recipientMobile: formattedMobileNumber,
        transactionId: transactionRef,
        message: recipientUser
          ? 'Your money has been sent successfully'
          : 'Payment sent (recipient not in system)',
        recipientFound: !!recipientUser
      });
      setShowPaymentNotification(true);
    } catch (error) {
      setPaymentStatus('failed');

      await sendNotification(
        'Payment Failed ❌',
        `Failed to send ₹${formatCurrency(amount)} to ${selectedContact?.name || 'recipient'}`,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      // Show failure notification
      setNotificationData({
        type: 'failed',
        amount,
        recipientName: selectedContact?.name || 'recipient',
        recipientMobile: mobileNumber,
        message: error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      });
      setShowPaymentNotification(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePinCancel = () => {
    setShowPinVerification(false);
    setPaymentStatus('idle');
  };

  const handleNotificationClose = () => {
    setShowPaymentNotification(false);
    setNotificationData(null);
    if (notificationData?.type === 'success') {
      // Reset form for successful payments
      setAmount('');
      setMobileNumber('');
      setNote('');
      setSelectedContact(null);
      setPaymentStatus('idle');
    } else {
      // For failed payments, just reset status to allow retry
      setPaymentStatus('idle');
    }
  };

  const validateForm = () => {
    const newErrors: { amount?: string; mobile?: string; general?: string } = {};

    // Amount validation
    if (!amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else {
      const numAmount = parseInt(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        newErrors.amount = 'Please enter a valid amount';
      } else if (numAmount < 1) {
        newErrors.amount = 'Minimum amount is ₹1';
      } else if (numAmount > 100000) {
        newErrors.amount = 'Maximum amount is ₹1,00,000';
      } else if (numAmount > (user?.balance ?? 0)) {
        newErrors.amount = `Insufficient balance. Available: ₹${formatCurrency((user?.balance ?? 0).toString())}`;
      }
    }

    // Mobile number validation
    if (!mobileNumber.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else {
      const cleanNumber = mobileNumber.replace(/[^0-9]/g, '');
      const normalizedNumber = cleanNumber.startsWith('91') ? cleanNumber.slice(2) : cleanNumber;
      if (!/^[6-9]\d{9}$/.test(normalizedNumber)) {
        newErrors.mobile = 'Please enter a valid 10-digit mobile number';
      } else if (normalizedNumber === user?.mobile?.replace(/[^0-9+]/g, '').replace('+91', '')) {
        newErrors.mobile = 'Cannot send money to your own number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const quickAmounts = ['500', '1000', '2000', '5000'];

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView behavior='height' className="flex-1">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}>
          <View className="flex-1 px-5 py-6">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-8 mt-3">
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => router.back()}
                  className="w-11 h-11 rounded-full bg-zinc-900/90 border border-zinc-800 items-center justify-center mr-4"
                >
                  <ChevronLeft size={20} color="white" />
                </Pressable>
                <Text className="text-xl font-semibold text-white">Send Money</Text>
              </View>
            </View>

            {/* Balance Card */}
            <View className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-6 mb-6 border border-zinc-800/50">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-zinc-400 text-sm font-medium">Available Balance</Text>
                <Pressable onPress={() => setShowBalance(!showBalance)} className="p-1">
                  <Eye size={16} color="#71717A" />
                </Pressable>
              </View>
              <Text className="text-white text-3xl font-bold tracking-tight">
                {showBalance ? `₹${formatCurrency((user?.balance ?? 0).toString())}` : '••••••'}
              </Text>
            </View>

            {/* Recipient Section */}
            <View className="mb-6">
              <Text className="text-white text-base font-semibold mb-4">Send To</Text>

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
                        onChangeText={(text) => {
                          setMobileNumber(text);
                          if (errors.mobile) {
                            setErrors(prev => ({ ...prev, mobile: undefined }));
                          }
                        }}
                        placeholder="Enter mobile number"
                        placeholderTextColor="#71717A"
                        className="text-white text-base"
                        keyboardType="phone-pad"
                        maxLength={15}
                        inputType="mobile"
                      />
                    </View>
                  </View>
                  {errors.mobile && (
                    <View className="px-4 pb-3">
                      <Text className="text-red-400 text-sm">{errors.mobile}</Text>
                    </View>
                  )}
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
                        onPress={() => {
                          handleContactSelect(contact);
                          if (errors.mobile) {
                            setErrors(prev => ({ ...prev, mobile: undefined }));
                          }
                        }}
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
                      Your recent transfers will appear here
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Amount Section */}
            <View className="mb-6">
              <Text className="text-white text-base font-semibold mb-4">Amount</Text>
              <View className="bg-zinc-900/70 rounded-2xl p-6 border border-zinc-800/50">
                <View className="items-center">
                  <Text className="text-zinc-400 text-lg mb-2">₹</Text>
                  <DataCollectionTextInput
                    value={amount ? formatCurrency(amount) : ''}
                    onChangeText={(text) => {
                      handleAmountChange(text);
                      if (errors.amount) {
                        setErrors(prev => ({ ...prev, amount: undefined }));
                      }
                    }}
                    placeholder="0"
                    placeholderTextColor="#52525B"
                    className="text-white text-4xl font-light text-center w-full"
                    keyboardType="numeric"
                    inputType="amount"
                    style={{ textAlign: 'center' }}
                  />
                </View>
                {errors.amount && (
                  <Text className="text-red-400 text-sm mt-3 text-center">{errors.amount}</Text>
                )}
              </View>

              {/* Quick Amount Buttons */}
              <View className="flex-row justify-between mt-4 space-x-2">
                {quickAmounts.map((quickAmount, index) => {
                  const isDisabled = parseInt(quickAmount) > (user?.balance ?? 0);
                  const isSelected = amount === quickAmount;
                  return (
                    <Pressable
                      key={quickAmount}
                      onPress={() => !isDisabled && setAmount(quickAmount)}
                      className={`flex-1 rounded-xl py-3 px-2 border ${isSelected
                        ? 'bg-blue-600 border-blue-500'
                        : isDisabled
                          ? 'bg-zinc-900/50 border-zinc-800/50 opacity-50'
                          : 'bg-zinc-900/70 border-zinc-800/50'
                        } ${index > 0 ? 'ml-2' : ''}`}
                      disabled={isDisabled}
                    >
                      <Text className={`text-sm text-center font-medium ${isSelected
                        ? 'text-white'
                        : isDisabled
                          ? 'text-zinc-500'
                          : 'text-zinc-300'
                        }`}>
                        ₹{formatCurrency(quickAmount)}
                      </Text>
                      {isDisabled && (
                        <Text className="text-zinc-600 text-xs text-center mt-1">Insufficient</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Note Section */}
            <View className="mb-6">
              <Text className="text-white text-base font-semibold mb-4">Add Note (Optional)</Text>
              <View className="bg-zinc-900/70 rounded-2xl p-4 border border-zinc-800/50">
                <DataCollectionTextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="What's this payment for?"
                  placeholderTextColor="#71717A"
                  className="text-white text-base"
                  multiline
                  numberOfLines={2000}
                  maxLength={25000}
                  inputType="text"
                />
              </View>
            </View>

            {/* Transaction Summary */}
            {amount && parseInt(amount) > 0 && (
              <View className="bg-zinc-950 rounded-2xl p-4 mb-6 border border-zinc-800/30">
                <Text className="text-zinc-300 text-sm font-medium mb-3">Transaction Summary</Text>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-zinc-400 text-sm">Amount</Text>
                  <Text className="text-white font-semibold">₹{formatCurrency(amount)}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-zinc-400 text-sm">Current Balance</Text>
                  <Text className="text-white">₹{formatCurrency((user?.balance ?? 0).toString())}</Text>
                </View>
                <View className="h-px bg-zinc-800 my-2" />
                <View className="flex-row justify-between items-center">
                  <Text className="text-zinc-400 text-sm">Balance After Transfer</Text>
                  <Text className={`font-semibold ${(user?.balance ?? 0) - parseInt(amount) < 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                    ₹{formatCurrency(Math.max(0, (user?.balance ?? 0) - parseInt(amount)).toString())}
                  </Text>
                </View>
              </View>
            )}

            {/* Security Note */}
            <View className="bg-zinc-900/50 rounded-xl p-4 mb-6 border border-zinc-800/30">
              <View className="flex-row items-center justify-center">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <Text className="text-zinc-300 text-sm font-medium text-center">
                  Safe & Secure Payments with Sentinel
                </Text>

              </View>
              <Text className="text-zinc-500 text-xs text-center mt-2">
                Your transaction is protected with bank-grade security
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Continue Button - Fixed at bottom */}
        <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-black border-t border-zinc-800/50">
          <Pressable
            onPress={handleContinue}
            className={`rounded-2xl py-4 px-6 ${amount && mobileNumber && !isProcessing && paymentStatus !== 'processing'
              ? 'bg-white'
              : 'bg-zinc-800'
              }`}
            disabled={!amount || !mobileNumber || isProcessing || paymentStatus === 'processing'}
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text className={`text-center text-lg font-semibold ${amount && mobileNumber && !isProcessing && paymentStatus !== 'processing'
              ? 'text-black'
              : 'text-zinc-500'
              }`}>
              {paymentStatus === 'processing' ? 'Processing...' : 'Continue'}
            </Text>
          </Pressable>
        </View>

        {/* PIN Verification Modal */}
        <PinVerification
          visible={showPinVerification}
          onClose={handlePinCancel}
          onSuccess={handlePinSuccess}
          title="Verify Payment"
          subtitle={`Enter PIN to send ₹${formatCurrency(amount)} to ${selectedContact?.name || 'recipient'}`}
        />

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