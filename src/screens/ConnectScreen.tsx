import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection } from '../contexts/ConnectionContext';
import QRScannerModal from '../components/QRScannerModal';
import ShareQRModal from '../components/ShareQRModal';

interface ConnectScreenProps {
  navigation: any;
}

const ConnectScreen: React.FC<ConnectScreenProps> = ({ navigation }) => {
  const [host, setHost] = useState('192.168.1.100');
  const [port, setPort] = useState('5505');
  const [remotePort, setRemotePort] = useState('5510');
  const [stagePort, setStagePort] = useState('5511');
  const [controlPort, setControlPort] = useState('5512');
  const [outputPort, setOutputPort] = useState('5513');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showShareQR, setShowShareQR] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { 
    isConnected, 
    connectionStatus, 
    savedConnectionSettings,
    connectionHistory,
    connect, 
    disconnect 
  } = useConnection();

  // Initialize form with saved settings
  useEffect(() => {
    if (savedConnectionSettings) {
      setHost(savedConnectionSettings.host);
      setPort(savedConnectionSettings.port.toString());
      
      // Load show ports if they exist
      if (savedConnectionSettings.showPorts) {
        setRemotePort(savedConnectionSettings.showPorts.remote.toString());
        setStagePort(savedConnectionSettings.showPorts.stage.toString());
        setControlPort(savedConnectionSettings.showPorts.control.toString());
        setOutputPort(savedConnectionSettings.showPorts.output.toString());
      }
    }
  }, [savedConnectionSettings]);

  const handleConnect = async () => {
    if (!host.trim()) {
      Alert.alert('Error', 'Please enter a valid host address');
      return;
    }

    const portNumber = parseInt(port);
    if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      Alert.alert('Error', 'Please enter a valid API port number (1-65535)');
      return;
    }

    // Validate show ports
    const showPorts = {
      remote: parseInt(remotePort),
      stage: parseInt(stagePort),
      control: parseInt(controlPort),
      output: parseInt(outputPort),
    };

    for (const [showName, portValue] of Object.entries(showPorts)) {
      if (isNaN(portValue) || portValue < 1 || portValue > 65535) {
        Alert.alert('Error', `Please enter a valid ${showName} port number (1-65535)`);
        return;
      }
    }

    try {
      const connected = await connect(host.trim(), portNumber, showPorts);
      if (connected) {
        navigation.navigate('Interface');
      }
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleHistoryConnect = async (historyItem: any) => {
    setHost(historyItem.host);
    setPort(historyItem.port.toString());
    setShowHistory(false);
    
    try {
      // Use saved show ports if available, otherwise use defaults
      const showPorts = historyItem.showPorts || {
        remote: 5510,
        stage: 5511,
        control: 5512,
        output: 5513,
      };
      const connected = await connect(historyItem.host, historyItem.port, showPorts);
      if (connected) {
        navigation.navigate('Interface');
      }
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleQRScan = (scannedIP: string) => {
    setHost(scannedIP);
    setShowQRScanner(false);
  };

  const isConnecting = connectionStatus === 'connecting';

  // Dynamic WiFi icon color based on connection status
  const getWiFiIconColor = () => {
    if (isConnected) {
      return '#4CAF50'; // Green when connected
    } else if (isConnecting) {
      return '#FF9800'; // Orange when connecting
    } else {
      return FreeShowTheme.colors.secondary; // Blue when disconnected
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          {!isConnected && (
            <View style={[styles.wifiIconContainer, isConnected && styles.wifiIconConnected]}>
              <Ionicons name="wifi" size={64} color={getWiFiIconColor()} />
            </View>
          )}
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Connect to FreeShow</Text>
            <Text style={styles.subtitle}>
              {isConnected 
                ? "You're connected! Manage your connection below." 
                : "Enter your FreeShow server details to get started"
              }
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Host/IP Address</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.inputWithIcon}
                value={host}
                onChangeText={setHost}
                placeholder="192.168.1.100"
                placeholderTextColor={FreeShowTheme.colors.text + '66'}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity 
                style={styles.qrButton} 
                onPress={() => setShowQRScanner(true)}
              >
                <Ionicons name="qr-code" size={24} color={FreeShowTheme.colors.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <Text style={styles.advancedText}>Advanced Settings</Text>
            <Ionicons 
              name={showAdvanced ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={FreeShowTheme.colors.text + '99'} 
            />
          </TouchableOpacity>

          {showAdvanced && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>API Port</Text>
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

              <Text style={styles.sectionTitle}>Show Interface Ports</Text>
              
              <View style={styles.portGrid}>
                <View style={styles.portInputGroup}>
                  <Text style={styles.portLabel}>RemoteShow</Text>
                  <TextInput
                    style={styles.portInput}
                    value={remotePort}
                    onChangeText={setRemotePort}
                    placeholder="5510"
                    placeholderTextColor={FreeShowTheme.colors.text + '66'}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>

                <View style={styles.portInputGroup}>
                  <Text style={styles.portLabel}>StageShow</Text>
                  <TextInput
                    style={styles.portInput}
                    value={stagePort}
                    onChangeText={setStagePort}
                    placeholder="5511"
                    placeholderTextColor={FreeShowTheme.colors.text + '66'}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>

                <View style={styles.portInputGroup}>
                  <Text style={styles.portLabel}>ControlShow</Text>
                  <TextInput
                    style={styles.portInput}
                    value={controlPort}
                    onChangeText={setControlPort}
                    placeholder="5512"
                    placeholderTextColor={FreeShowTheme.colors.text + '66'}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>

                <View style={styles.portInputGroup}>
                  <Text style={styles.portLabel}>OutputShow</Text>
                  <TextInput
                    style={styles.portInput}
                    value={outputPort}
                    onChangeText={setOutputPort}
                    placeholder="5513"
                    placeholderTextColor={FreeShowTheme.colors.text + '66'}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Connection History Section */}
        {!isConnected && connectionHistory.length > 0 && (
          <View style={styles.historySection}>
            <TouchableOpacity 
              style={styles.historyToggle}
              onPress={() => setShowHistory(!showHistory)}
            >
              <Text style={styles.historyTitle}>Recent Connections</Text>
              <Ionicons 
                name={showHistory ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={FreeShowTheme.colors.text + '99'} 
              />
            </TouchableOpacity>
            
            {showHistory && (
              <ScrollView style={styles.historyList} nestedScrollEnabled>
                {connectionHistory.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.historyItem}
                    onPress={() => handleHistoryConnect(item)}
                  >
                    <View style={styles.historyItemContent}>
                      <Text style={styles.historyHost}>{item.host}:{item.port}</Text>
                      <Text style={styles.historyDate}>
                        {new Date(item.lastUsed).toLocaleDateString()}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={FreeShowTheme.colors.text + '66'} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <View style={styles.actions}>
          {isConnected ? (
            <View style={styles.connectedActions}>
              <TouchableOpacity
                style={[styles.button, styles.shareActionButton]}
                onPress={() => setShowShareQR(true)}
              >
                <Ionicons name="share-outline" size={20} color="white" />
                <Text style={styles.buttonText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.disconnectButton]}
                onPress={handleDisconnect}
              >
                <Ionicons name="wifi" size={20} color="white" />
                <Text style={styles.buttonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.connectButton, isConnecting && styles.connectingButton]}
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
                  <Text style={styles.buttonText}>Connect</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {!isConnected && (
          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Connection Tips:</Text>
            <Text style={styles.tipsText}>• Make sure FreeShow is running on your computer</Text>
            <Text style={styles.tipsText}>• Enable WebSocket/REST API in FreeShow Settings → Connections</Text>
            <Text style={styles.tipsText}>• Use your computer's local IP address (usually starts with 192.168.x.x)</Text>
            <Text style={styles.tipsText}>• Default port is 5505 for WebSocket API</Text>
            <Text style={styles.tipsText}>• Both devices should be on the same WiFi network</Text>
          </View>
        )}

        <QRScannerModal
          visible={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScan}
        />

        <ShareQRModal
          visible={showShareQR}
          onClose={() => setShowShareQR(false)}
          host={host}
          port={port}
        />
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
    position: 'relative',
  },
  titleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  shareButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: FreeShowTheme.spacing.md,
    borderRadius: 24,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.primaryLighter,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wifiIconContainer: {
    padding: FreeShowTheme.spacing.md,
    borderRadius: 50,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  wifiIconConnected: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)', // Light green glow
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: FreeShowTheme.fontSize.xxxl,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.secondary,
    marginTop: FreeShowTheme.spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text + '99',
    textAlign: 'center',
    marginTop: FreeShowTheme.spacing.sm,
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
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputWithIcon: {
    flex: 1,
    height: 50,
    fontSize: FreeShowTheme.fontSize.md,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.primaryLighter,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingRight: 50,
    color: FreeShowTheme.colors.text,
  },
  qrButton: {
    position: 'absolute',
    right: FreeShowTheme.spacing.sm,
    padding: FreeShowTheme.spacing.sm,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.sm,
    marginBottom: FreeShowTheme.spacing.md,
  },
  advancedText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text + '99',
  },
  actions: {
    marginBottom: FreeShowTheme.spacing.xxxl,
  },
  connectedActions: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    minHeight: 56,
    flex: 1,
  },
  connectButton: {
    backgroundColor: '#f0008c', // FreeShow pink
  },
  connectingButton: {
    backgroundColor: '#FF9800', // Orange when connecting
  },
  disconnectButton: {
    backgroundColor: '#FF4136',
  },
  shareActionButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
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
  },
  tipsText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + 'CC',
    marginBottom: FreeShowTheme.spacing.xs,
  },
  historySection: {
    marginBottom: FreeShowTheme.spacing.lg,
  },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.sm,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  historyTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
  historyList: {
    maxHeight: 200,
    marginTop: FreeShowTheme.spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    marginBottom: FreeShowTheme.spacing.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  historyItemContent: {
    flex: 1,
  },
  historyHost: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    fontWeight: '500',
  },
  historyDate: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + '99',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  portGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  portInputGroup: {
    width: '48%',
    minWidth: 120,
  },
  portLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: FreeShowTheme.colors.text,
    marginBottom: 4,
  },
  portInput: {
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: FreeShowTheme.colors.text,
    backgroundColor: FreeShowTheme.colors.surface,
  },
});

export default ConnectScreen;


