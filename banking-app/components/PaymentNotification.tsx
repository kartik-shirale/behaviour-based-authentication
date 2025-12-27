import { router } from 'expo-router';
import { Check, ChevronRight, Copy, X, Share2, Home, Send } from 'lucide-react-native';
import React from 'react';
import { Alert, Modal, Pressable, Share, Text, View } from 'react-native';

interface PaymentNotificationProps {
  visible: boolean;
  onClose: () => void;
  type: 'success' | 'failed';
  amount: string;
  recipientName: string;
  recipientMobile: string;
  transactionId?: string;
  message?: string;
  recipientFound?: boolean;
}

export default function PaymentNotification({
  visible,
  onClose,
  type,
  amount,
  recipientName,
  recipientMobile,
  transactionId,
  message,
  recipientFound = true
}: PaymentNotificationProps) {
  const formatCurrency = (value: string | number) => {
    const numericValue = typeof value === 'string' ? parseInt(value) : value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(numericValue);
  };

  const formatDate = () => {
    return new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleShareReceipt = async () => {
    if (type !== 'success' || !transactionId) return;

    try {
      const receiptText = `🧾 Payment Receipt\n\n` +
        `Amount: ${formatCurrency(amount)}\n` +
        `To: ${recipientName}\n` +
        `Mobile: ${recipientMobile}\n` +
        `Transaction ID: ${transactionId}\n` +
        `Date: ${formatDate()}\n` +
        `Status: Completed\n\n` +
        `Sent via SecureBank App`;

      await Share.share({
        message: receiptText,
        title: 'Payment Receipt'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share receipt');
    }
  };

  const handleCopyTransactionId = () => {
    if (transactionId) {
      // In a real app, you'd use Clipboard API
      Alert.alert('Copied', 'Transaction ID copied to clipboard');
    }
  };

  const handleGoToDashboard = () => {
    onClose();
    router.replace('/(app)/dashboard');
  };

  const handleSendMore = () => {
    onClose();
    router.push('/(app)/send-money');
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 justify-center items-center px-6">
        <View className="bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-zinc-800">
          {/* Status Icon */}
          <View className="items-center mb-6">
            <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'
              }`}>
              {type === 'success' ? (
                <Check size={40} color="white" />
              ) : (
                <X size={40} color="white" />
              )}
            </View>
            <Text className="text-white text-2xl font-bold mb-2">
              {type === 'success' ? 'Payment Successful!' : 'Payment Failed'}
            </Text>
            <Text className="text-white/70 text-center text-base">
              {message || (type === 'success'
                ? 'Your money has been sent successfully'
                : 'Something went wrong with your payment'
              )}
            </Text>
          </View>

          {/* Transaction Details */}
          {type === 'success' && (
            <View className="bg-zinc-800/50 rounded-2xl p-4 mb-6">
              {/* Amount */}
              <View className="items-center mb-4 pb-4 border-b border-zinc-700">
                <Text className="text-white/70 text-sm mb-1">Amount Sent</Text>
                <Text className="text-white text-2xl font-bold">{formatCurrency(amount)}</Text>
              </View>

              {/* Recipient */}
              <View className="items-center mb-4">
                <View className="w-12 h-12 bg-zinc-700 rounded-full items-center justify-center mb-2">
                  <Text className="text-white text-lg font-bold">
                    {recipientName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text className="text-white text-lg font-semibold">{recipientName}</Text>
                <Text className="text-white/70 text-sm">{recipientMobile}</Text>
                {!recipientFound && (
                  <Text className="text-yellow-400 text-xs mt-1">Recipient not in system</Text>
                )}
              </View>

              {/* Transaction ID */}
              {transactionId && (
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-white/70 text-sm">Transaction ID</Text>
                  <Pressable
                    onPress={handleCopyTransactionId}
                    className="flex-row items-center"
                  >
                    <Text className="text-white font-mono text-xs mr-2">
                      {transactionId.slice(0, 12)}...
                    </Text>
                    <Copy size={14} color="#9CA3AF" />
                  </Pressable>
                </View>
              )}

              {/* Date */}
              <View className="flex-row justify-between items-center">
                <Text className="text-white/70 text-sm">Date & Time</Text>
                <Text className="text-white text-sm">{formatDate()}</Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View className="gap-y-2">
            <View className="flex-row justify-center gap-x-4">
              {type === 'success' && transactionId && (
                <Pressable
                  onPress={handleShareReceipt}
                  className="w-14 h-14 bg-zinc-800 rounded-full items-center justify-center"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Share2 size={20} color="white" />
                </Pressable>
              )}

              <Pressable
                onPress={handleGoToDashboard}
                className="w-14 h-14 bg-white rounded-full items-center justify-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <Home size={20} color="black" />
              </Pressable>

              {type === 'success' && (
                <Pressable
                  onPress={handleSendMore}
                  className="w-14 h-14 bg-zinc-800 rounded-full items-center justify-center"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Send size={20} color="white" />
                </Pressable>
              )}
            </View>

            {type === 'failed' && (
              <View className="flex-row justify-center">
                <Pressable
                  onPress={onClose}
                  className="w-14 h-14 bg-zinc-800 rounded-full items-center justify-center"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <X size={20} color="white" />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}