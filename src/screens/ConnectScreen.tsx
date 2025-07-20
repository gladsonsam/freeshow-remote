import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection } from '../contexts/ConnectionContext';
import { ConnectionBanner } from '../components/ConnectionBanner';

interface ConnectScreenProps {
  navigation: any;
}

const ConnectScreen: React.FC<ConnectScreenProps> = ({ navigation }) => {
  const [host, setHost] = useState('192.168.1.100');
  const [port, setPort] = useState('5505');
  const { isConnected, connectionStatus, connect, disconnect } = useConnection();

  const handleConnect = async () => {
    if (!host.trim()) {
      Alert.alert('Error', 'Please enter a valid host address');
      return;
    }

    const portNumber = parseInt(port);
    if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      Alert.alert('Error', 'Please enter a valid port number (1-65535)');
      return;
    }

    try {
      const connected = await connect(host.trim(), portNumber);
      if (connected) {
        Alert.alert('Success', 'Connected to FreeShow!', [
          { text: 'OK', onPress: () => navigation.navigate('Interface') }
        ]);
      }
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const isConnecting = connectionStatus === 'connecting';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Ionicons name="wifi" size={64} color={FreeShowTheme.colors.secondary} />
          <Text style={styles.title}>Connect to FreeShow</Text>
          <Text style={styles.subtitle}>
            Enter your FreeShow server details to get started
          </Text>
        </View>

        <ConnectionBanner />

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Host/IP Address</Text>
            <TextInput
              style={styles.input}
              value={host}
              onChangeText={setHost}
              placeholder="192.168.1.100"
              placeholderTextColor={FreeShowTheme.colors.text + '66'}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Port</Text>
            <TextInput
              style={styles.input}
              value={port}
              onChangeText={setPort}
              placeholder="5505"
              placeholderTextColor={FreeShowTheme.colors.text + '66'}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>
        </View>

        <View style={styles.actions}>
          {isConnected ? (
            <TouchableOpacity
              style={[styles.button, styles.disconnectButton]}
              onPress={handleDisconnect}
            >
              <Ionicons name="close-circle" size={20} color="white" />
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.connectButton]}
              onPress={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <View style={styles.spinner} />
                  <Text style={styles.buttonText}>Connecting...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="wifi" size={20} color="white" />
                  <Text style={styles.buttonText}>Connect</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Connection Tips:</Text>
          <Text style={styles.tipsText}>• Make sure FreeShow is running on your computer</Text>
          <Text style={styles.tipsText}>• Enable WebSocket/REST API in FreeShow Settings → Connections</Text>
          <Text style={styles.tipsText}>• Use your computer's local IP address (usually starts with 192.168.x.x)</Text>
          <Text style={styles.tipsText}>• Default port is 5505 for WebSocket API</Text>
          <Text style={styles.tipsText}>• Both devices should be on the same WiFi network</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  keyboardView: {
    flex: 1,
    padding: FreeShowTheme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.xxxl,
  },
  title: {
    fontSize: FreeShowTheme.fontSize.xxxl,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.secondary,
    marginTop: FreeShowTheme.spacing.lg,
    textAlign: 'center',
    fontFamily: FreeShowTheme.fonts.system,
  },
  subtitle: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text + '99',
    textAlign: 'center',
    marginTop: FreeShowTheme.spacing.sm,
    fontFamily: FreeShowTheme.fonts.system,
  },
  form: {
    marginBottom: FreeShowTheme.spacing.xxxl,
  },
  inputGroup: {
    marginBottom: FreeShowTheme.spacing.xl,
  },
  label: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.sm,
    fontWeight: '600',
    fontFamily: FreeShowTheme.fonts.system,
  },
  input: {
    height: 50,
    fontSize: FreeShowTheme.fontSize.md,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.primaryLighter,
    paddingHorizontal: FreeShowTheme.spacing.md,
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
  },
  actions: {
    marginBottom: FreeShowTheme.spacing.xxxl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.lg,
    paddingHorizontal: FreeShowTheme.spacing.xl,
    borderRadius: FreeShowTheme.borderRadius.lg,
    gap: FreeShowTheme.spacing.sm,
  },
  connectButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  disconnectButton: {
    backgroundColor: '#FF4136',
  },
  buttonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    fontFamily: FreeShowTheme.fonts.system,
  },
  spinner: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'white',
    borderTopColor: 'transparent',
    borderRadius: 10,
  },
  tips: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  tipsTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.secondary,
    marginBottom: FreeShowTheme.spacing.sm,
    fontFamily: FreeShowTheme.fonts.system,
  },
  tipsText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + 'CC',
    marginBottom: FreeShowTheme.spacing.xs,
    fontFamily: FreeShowTheme.fonts.system,
  },
});

export default ConnectScreen;
