import {
  Activity,
  BarChart3,
  Building,
  Check,
  Clipboard,
  Globe,
  Hand,
  Keyboard,
  Lock,
  PenTool,
  Radio,
  Rocket,
  Shield,
  Signal,
  Smartphone,
  StopCircle,
  Target,
  TestTube,
  TrendingUp,
  X
} from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import DataCollectionTextInput from '../components/DataCollectionTextInput';
import { TouchTrackingWrapper } from '../components/TouchTrackingWrapper';
import { useDataCollectionStore } from '../stores/useDataCollectionStore';

export default function DataCollectionTest() {
  const {
    currentSession,
    touchEvents,
    keystrokes,
    motionEvents,
    networkBehavior,
    isCollecting,
    startSession,
    endSessionAndSendData,
    startDataCollection,
    requestPermissions,
    collectNetworkBehavior,
  } = useDataCollectionStore();

  const [testText, setTestText] = useState('');

  const handleStartSession = async () => {
    await startSession('test_user_123');
  };

  const handleStartDataCollection = async () => {
    await startDataCollection('login');
  };

  const handleEndSession = async () => {
    await endSessionAndSendData('/api/data/regular');
  };

  const handleRequestPermissions = async () => {
    await requestPermissions();
  };

  const handleTestSimCountry = async () => {
    await collectNetworkBehavior();
  };

  return (
    <ScrollView className="flex-1 bg-white p-4">
      <View className="flex-row items-center justify-center mb-4">
        <TestTube size={24} color="#3B82F6" />
        <Text className="text-2xl font-bold ml-2 text-center">Data Collection Test</Text>
      </View>

      {/* Status Display */}
      <View className="mb-4 p-4 bg-gray-100 rounded-lg">
        <View className="flex-row items-center mb-2">
          <BarChart3 size={20} color="#374151" />
          <Text className="font-bold text-lg ml-2">Current Status</Text>
        </View>
        <View className="flex-row items-center mb-1">
          {currentSession ? <Check size={16} color="#10B981" /> : <X size={16} color="#EF4444" />}
          <Text className="ml-2">Session Active: {currentSession ? 'YES' : 'NO'}</Text>
        </View>
        <View className="flex-row items-center mb-1">
          {isCollecting ? <Check size={16} color="#10B981" /> : <X size={16} color="#EF4444" />}
          <Text className="ml-2">Collecting Data: {isCollecting ? 'YES' : 'NO'}</Text>
        </View>
        <Text className="mb-1">Session ID: {currentSession?.sessionId || 'None'}</Text>
      </View>

      {/* Data Counts */}
      <View className="mb-4 p-4 bg-blue-50 rounded-lg">
        <View className="flex-row items-center mb-2">
          <TrendingUp size={20} color="#3B82F6" />
          <Text className="font-bold text-lg ml-2">Collected Data</Text>
        </View>
        <View className="flex-row items-center mb-1">
          <Hand size={16} color="#3B82F6" />
          <Text className="ml-2">Touch Events: {touchEvents.length}</Text>
        </View>
        <View className="flex-row items-center mb-1">
          <Keyboard size={16} color="#3B82F6" />
          <Text className="ml-2">Keystrokes: {keystrokes.length}</Text>
        </View>
        <View className="flex-row items-center mb-1">
          <Activity size={16} color="#3B82F6" />
          <Text className="ml-2">Motion Events: {motionEvents.length}</Text>
        </View>
      </View>

      {/* Network Behavior Data */}
      <View className="mb-4 p-4 bg-green-50 rounded-lg">
        <View className="flex-row items-center mb-2">
          <Globe size={20} color="#10B981" />
          <Text className="font-bold text-lg ml-2">Network Behavior</Text>
        </View>
        <View className="flex-row items-center mb-1">
          <Signal size={16} color="#10B981" />
          <Text className="ml-2">Network Type: {networkBehavior?.networkType || 'Not collected'}</Text>
        </View>
        <View className="flex-row items-center mb-1">
          <Radio size={16} color="#10B981" />
          <Text className="ml-2">Network Operator: {networkBehavior?.networkOperator || 'Not collected'}</Text>
        </View>
        <View className="flex-row items-center mb-1">
          <Smartphone size={16} color="#10B981" />
          <Text className="ml-2">SIM Country: {networkBehavior?.simCountry || 'Not collected'}</Text>
        </View>
        <View className="flex-row items-center mb-1">
          <Building size={16} color="#10B981" />
          <Text className="ml-2">SIM Operator: {networkBehavior?.simOperator || 'Not collected'}</Text>
        </View>
        <View className="flex-row items-center mb-1">
          <Shield size={16} color="#10B981" />
          {networkBehavior?.vpnDetected ? <Check size={16} color="#10B981" className="ml-2" /> : <X size={16} color="#EF4444" className="ml-2" />}
          <Text className="ml-2">VPN Detected: {networkBehavior?.vpnDetected ? 'YES' : 'NO'}</Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View className="mb-4 space-y-2">
        <TouchableOpacity
          onPress={handleRequestPermissions}
          className="bg-blue-500 p-3 rounded-lg"
        >
          <View className="flex-row items-center justify-center">
            <Lock size={16} color="white" />
            <Text className="text-white text-center font-semibold ml-2">Request Permissions</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleStartSession}
          disabled={!!currentSession}
          className={`p-3 rounded-lg ${currentSession ? 'bg-gray-300' : 'bg-green-500'
            }`}
        >
          <View className="flex-row items-center justify-center">
            <Rocket size={16} color="white" />
            <Text className="text-white text-center font-semibold ml-2">Start Session</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleStartDataCollection}
          disabled={!currentSession || isCollecting}
          className={`p-3 rounded-lg ${!currentSession || isCollecting ? 'bg-gray-300' : 'bg-purple-500'
            }`}
        >
          <View className="flex-row items-center justify-center">
            <Target size={16} color="white" />
            <Text className="text-white text-center font-semibold ml-2">Start Data Collection</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleTestSimCountry}
          className="bg-cyan-500 p-3 rounded-lg"
        >
          <View className="flex-row items-center justify-center">
            <Smartphone size={16} color="white" />
            <Text className="text-white text-center font-semibold ml-2">Test SIM Country Collection</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleEndSession}
          disabled={!currentSession}
          className={`p-3 rounded-lg ${!currentSession ? 'bg-gray-300' : 'bg-red-500'
            }`}
        >
          <View className="flex-row items-center justify-center">
            <StopCircle size={16} color="white" />
            <Text className="text-white text-center font-semibold ml-2">End Session</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Test Input Area */}
      <View className="mb-4 p-4 bg-yellow-50 rounded-lg">
        <View className="flex-row items-center mb-2">
          <PenTool size={20} color="#D97706" />
          <Text className="font-bold text-lg ml-2">Test Input (with Data Collection)</Text>
        </View>
        <Text className="text-sm text-gray-600 mb-2">
          Type here to test keystroke collection. Touch the screen to test touch collection.
        </Text>

        <TouchTrackingWrapper>
          <DataCollectionTextInput
            value={testText}
            onChangeText={setTestText}
            placeholder="Type here to test keystroke collection..."
            className="border border-gray-300 rounded p-3 bg-white"
            multiline
            numberOfLines={3}
            inputType="text"
          />
        </TouchTrackingWrapper>
      </View>

      {/* Instructions */}
      <View className="mb-4 p-4 bg-orange-50 rounded-lg">
        <View className="flex-row items-center mb-2">
          <Clipboard size={20} color="#EA580C" />
          <Text className="font-bold text-lg ml-2">Instructions</Text>
        </View>
        <Text className="text-sm mb-1">1. Request permissions first</Text>
        <Text className="text-sm mb-1">2. Start a session</Text>
        <Text className="text-sm mb-1">3. Start data collection</Text>
        <Text className="text-sm mb-1">4. Test SIM country collection</Text>
        <Text className="text-sm mb-1">5. Type in the text input and touch the screen</Text>
        <Text className="text-sm mb-1">6. End session to send data</Text>
      </View>
    </ScrollView>
  );
}