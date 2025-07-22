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
  Animated,
  Dimensions,
  Image,
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
  const [remotePort, setRemotePort] = useState('5510');
  const [stagePort, setStagePort] = useState('5511');
  const [controlPort, setControlPort] = useState('5512');
  const [outputPort, setOutputPort] = useState('5513');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showShareQR, setShowShareQR] = useState(false);
  const [connectionPulse] = useState(new Animated.Value(1));
  const { 
    isConnected, 
    connectionStatus,
    connectionHost,
    connectionHistory,
    discoveredServices,
    isDiscovering,
    isDiscoveryAvailable,
    connect, 
    disconnect,
    startDiscovery,
    stopDiscovery,
    getConnectionHistory,
    removeFromHistory,
    clearAllHistory,
    updateCurrentShowPorts
  } = useConnection();

  // Connection pulse animation for visual feedback
  useEffect(() => {
    if (isConnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(connectionPulse, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(connectionPulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      connectionPulse.setValue(1);
    }
  }, [isConnected]);

  // Update form fields when connection changes (auto-connect or manual connect)
  useEffect(() => {
    if (isConnected && connectionHost) {
      setHost(connectionHost);
      // Port should remain as user set or default
    }
  }, [isConnected, connectionHost]);

  // Update form fields when connected to show current connection details
  useEffect(() => {
    if (isConnected && connectionHost) {
      console.log('Updating form with current connection:', connectionHost);
      setHost(connectionHost);
    }
  }, [isConnected, connectionHost, connectionHistory]);

  // Update current show ports whenever port values change and we're connected
  useEffect(() => {
    if (isConnected) {
      const showPorts = {
        remote: parseInt(remotePort) || 5510,
        stage: parseInt(stagePort) || 5511,
        control: parseInt(controlPort) || 5512,
        output: parseInt(outputPort) || 5513,
      };
      updateCurrentShowPorts(showPorts);
    }
  }, [isConnected, remotePort, stagePort, controlPort, outputPort]);

  const handleConnect = async () => {
    if (!host.trim()) {
      Alert.alert('Error', 'Please enter a valid host address');
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
      const connected = await connect(host.trim(), 5505, showPorts); // Always use port 5505
      if (connected) {
        navigation.navigate('Interface');
      }
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleHistoryConnect = async (historyItem: any) => {
    setHost(historyItem.host);
    
    // Update interface ports from stored history
    if (historyItem.showPorts) {
      setRemotePort(historyItem.showPorts.remote.toString());
      setStagePort(historyItem.showPorts.stage.toString());
      setControlPort(historyItem.showPorts.control.toString());
      setOutputPort(historyItem.showPorts.output.toString());
    }
    
    try {
      // Use stored interface ports if available, otherwise use current form values
      const showPorts = historyItem.showPorts || {
        remote: parseInt(remotePort),
        stage: parseInt(stagePort),
        control: parseInt(controlPort),
        output: parseInt(outputPort),
      };
      const connected = await connect(historyItem.host, 5505, showPorts); // Always use port 5505
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

  const handleDiscoveredConnect = async (service: any) => {
    // Use the IP address and ignore the discovered port
    const ip = service.ip || service.host;
    setHost(ip);
    stopDiscovery();
    
    try {
      // Get current interface port settings
      const showPorts = {
        remote: parseInt(remotePort),
        stage: parseInt(stagePort),
        control: parseInt(controlPort),
        output: parseInt(outputPort),
      };
      
      const connected = await connect(ip, 5505, showPorts); // Always use port 5505
      if (connected) {
        navigation.navigate('Interface');
      }
    } catch (error) {
      console.error('Connection to discovered service failed:', error);
    }
  };

  const handleRemoveFromHistory = async (itemId: string) => {
    await removeFromHistory(itemId);
  };

  const handleClearAllHistory = async () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to remove all connection history? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllHistory();
          },
        },
      ]
    );
  };

  const toggleDiscovery = () => {
    if (isDiscovering) {
      stopDiscovery();
    } else {
      startDiscovery();
    }
  };

  const handleQRScan = (scannedIP: string) => {
    setHost(scannedIP);
    setShowQRScanner(false);
  };

  const isConnecting = connectionStatus === 'connecting';

  const getStatusDisplay = (): {
    color: string;
    text: string;
    icon: 'checkmark-circle' | 'time' | 'radio-button-off';
  } => {
    if (isConnected) {
      return {
        color: FreeShowTheme.colors.connected,
        text: 'Connected',
        icon: 'checkmark-circle',
      };
    } else if (isConnecting) {
      return {
        color: '#FF9800',
        text: 'Connecting...',
        icon: 'time',
      };
    } else {
      return {
        color: FreeShowTheme.colors.textSecondary,
        text: 'Not Connected',
        icon: 'radio-button-off',
      };
    }
  };

  const status = getStatusDisplay();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandContainer}>
              <View style={styles.logoContainer}>
                <View style={[styles.logoIcon, isConnected && styles.logoConnected]}>
                  <Image 
                    source={require('../../assets/icon.png')} 
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <Text style={styles.appTitle}>FreeShow Remote</Text>
            </View>
            
            <View style={styles.statusContainer}>
              <Animated.View style={[
                styles.statusIndicator,
                { transform: [{ scale: isConnected ? connectionPulse : 1 }] }
              ]}>
                <Ionicons name={status.icon} size={16} color={status.color} />
              </Animated.View>
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
          </View>

          {/* Quick Connect Section - Premium placement */}
          {!isConnected && (connectionHistory.length > 0 || discoveredServices.length > 0 || isDiscoveryAvailable) && (
            <View style={styles.quickConnectCard}>
              <View style={styles.quickConnectHeader}>
                <View style={styles.quickConnectTitleContainer}>
                  <Ionicons name="flash" size={20} color={FreeShowTheme.colors.secondary} />
                  <Text style={styles.quickConnectTitle}>Quick Connect</Text>
                </View>
                <Text style={styles.quickConnectSubtitle}>Tap to connect instantly</Text>
              </View>
              
              <View style={styles.quickConnectContent}>
                {/* Auto Discovery */}
                {isDiscoveryAvailable && (
                  <View style={styles.discoverySection}>
                    <View style={styles.discoverySectionHeader}>
                      <View style={styles.discoveryTitleRow}>
                        <Ionicons name="scan" size={16} color={FreeShowTheme.colors.secondary} />
                        <Text style={styles.discoveryTitle}>Network Scan</Text>
                      </View>
                      <TouchableOpacity 
                        onPress={toggleDiscovery}
                        style={[styles.discoveryToggle, isDiscovering && styles.discoveryToggleActive]}
                      >
                        <Ionicons 
                          name={isDiscovering ? "stop" : "search"} 
                          size={16} 
                          color={isDiscovering ? 'white' : FreeShowTheme.colors.secondary} 
                        />
                        <Text style={[styles.discoveryToggleText, isDiscovering && styles.discoveryToggleTextActive]}>
                          {isDiscovering ? 'Stop' : 'Scan'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    {discoveredServices.length > 0 ? (
                      <View style={styles.discoveredDevices}>
                        {discoveredServices.map((service, index) => (
                          <TouchableOpacity
                            key={service.ip}
                            style={styles.discoveredDevice}
                            onPress={() => handleDiscoveredConnect(service)}
                          >
                            <View style={styles.discoveredDeviceIcon}>
                              <Ionicons name="desktop" size={18} color={FreeShowTheme.colors.secondary} />
                            </View>
                            <View style={styles.discoveredDeviceInfo}>
                              <Text style={styles.discoveredDeviceIP}>{service.ip}</Text>
                              <Text style={styles.discoveredDeviceStatus}>FreeShow Instance</Text>
                            </View>
                            <View style={styles.discoveredDeviceAction}>
                              <Ionicons name="arrow-forward-circle" size={24} color={FreeShowTheme.colors.secondary} />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.emptyDiscovery}>
                        <Ionicons 
                          name={isDiscovering ? "hourglass" : "search-outline"} 
                          size={24} 
                          color={FreeShowTheme.colors.textSecondary} 
                        />
                        <Text style={styles.emptyDiscoveryText}>
                          {isDiscovering ? 'Scanning network...' : 'Tap scan to find devices'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Recent Connections */}
                {connectionHistory.length > 0 && (
                  <View style={styles.recentSection}>
                    <View style={styles.recentSectionHeader}>
                      <View style={styles.recentTitleRow}>
                        <Ionicons name="time" size={16} color={FreeShowTheme.colors.textSecondary} />
                        <Text style={styles.recentTitle}>Recent Connections</Text>
                      </View>
                      <TouchableOpacity 
                        onPress={handleClearAllHistory}
                        style={styles.clearAllButton}
                      >
                        <Ionicons name="trash-outline" size={16} color={FreeShowTheme.colors.textSecondary} />
                        <Text style={styles.clearAllText}>Clear All</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.recentDevices}>
                      {connectionHistory.slice(0, 3).map((item, index) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.recentDevice}
                          onPress={() => handleHistoryConnect(item)}
                        >
                          <View style={styles.recentDeviceInfo}>
                            <Text style={styles.recentDeviceIP}>{item.host}</Text>
                            <Text style={styles.recentDeviceTime}>
                              {new Date(item.lastUsed).toLocaleDateString()}
                              {item.name && ` • ${item.name}`}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.deleteConnectionButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleRemoveFromHistory(item.id);
                            }}
                          >
                            <Ionicons name="trash-outline" size={16} color={FreeShowTheme.colors.textSecondary} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Main Connection Form */}
          <View style={styles.mainCard}>
            <Text style={styles.cardTitle}>
              {isConnected ? 'Connection Details' : 'Manual Connection'}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Server Address</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  value={host}
                  onChangeText={setHost}
                  placeholder="192.168.1.100"
                  placeholderTextColor={FreeShowTheme.colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isConnected}
                />
                <TouchableOpacity 
                  style={styles.inputAction} 
                  onPress={() => setShowQRScanner(true)}
                  disabled={isConnected}
                >
                  <Ionicons name="qr-code-outline" size={22} color={FreeShowTheme.colors.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Advanced Settings Toggle */}
            <TouchableOpacity 
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <Text style={styles.advancedText}>Interface Ports</Text>
              <Ionicons 
                name={showAdvanced ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={FreeShowTheme.colors.textSecondary} 
              />
            </TouchableOpacity>

            {/* Advanced Settings */}
            {showAdvanced && (
              <View style={styles.advancedSection}>
                <View style={styles.portGrid}>
                  <View style={styles.portItem}>
                    <Text style={styles.portLabel}>Remote</Text>
                    <TextInput
                      style={styles.portInput}
                      value={remotePort}
                      onChangeText={setRemotePort}
                      placeholder="5510"
                      placeholderTextColor={FreeShowTheme.colors.textSecondary}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>

                  <View style={styles.portItem}>
                    <Text style={styles.portLabel}>Stage</Text>
                    <TextInput
                      style={styles.portInput}
                      value={stagePort}
                      onChangeText={setStagePort}
                      placeholder="5511"
                      placeholderTextColor={FreeShowTheme.colors.textSecondary}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>

                  <View style={styles.portItem}>
                    <Text style={styles.portLabel}>Control</Text>
                    <TextInput
                      style={styles.portInput}
                      value={controlPort}
                      onChangeText={setControlPort}
                      placeholder="5512"
                      placeholderTextColor={FreeShowTheme.colors.textSecondary}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>

                  <View style={styles.portItem}>
                    <Text style={styles.portLabel}>Output</Text>
                    <TextInput
                      style={styles.portInput}
                      value={outputPort}
                      onChangeText={setOutputPort}
                      placeholder="5513"
                      placeholderTextColor={FreeShowTheme.colors.textSecondary}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Main Action Button */}
            <View style={styles.actionContainer}>
              {isConnected ? (
                <View style={styles.connectedActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.shareButton]}
                    onPress={() => setShowShareQR(true)}
                  >
                    <Ionicons name="share-outline" size={20} color="white" />
                    <Text style={styles.buttonText}>Share</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.disconnectButton]}
                    onPress={handleDisconnect}
                  >
                    <Ionicons name="log-out-outline" size={20} color="white" />
                    <Text style={styles.buttonText}>Disconnect</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.connectButton, isConnecting && styles.connectingButton]}
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
          </View>

          {/* Help Section */}
          {!isConnected && (
            <View style={styles.helpCard}>
              <View style={styles.helpHeader}>
                <Ionicons name="help-circle-outline" size={20} color={FreeShowTheme.colors.secondary} />
                <Text style={styles.helpTitle}>Connection Help</Text>
              </View>
              <Text style={styles.helpText}>
                • Make sure FreeShow is running with WebSocket enabled{'\n'}
                • Both devices should be on the same WiFi network{'\n'}
                • Use your computer's local IP address (192.168.x.x)
              </Text>
            </View>
          )}
        </ScrollView>

        <QRScannerModal
          visible={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScan}
        />

        <ShareQRModal
          visible={showShareQR}
          onClose={() => setShowShareQR(false)}
          host={host}
          port="5505"
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.xxxl,
  },
  
  // Header Styles
  header: {
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.xl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.lg,
  },
  logoContainer: {
    marginBottom: FreeShowTheme.spacing.md,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: FreeShowTheme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: FreeShowTheme.colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  logoConnected: {
    shadowColor: FreeShowTheme.colors.connected,
    borderColor: FreeShowTheme.colors.connected,
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.secondary,
  },
  appTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  statusIndicator: {
    marginRight: FreeShowTheme.spacing.sm,
  },
  statusText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
  },
  
  // Quick Connect Styles
  quickConnectCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginBottom: FreeShowTheme.spacing.lg,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.secondary + '30',
    shadowColor: FreeShowTheme.colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  quickConnectHeader: {
    backgroundColor: FreeShowTheme.colors.secondary + '15',
    padding: FreeShowTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.secondary + '20',
  },
  quickConnectTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.xs,
  },
  quickConnectTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginLeft: FreeShowTheme.spacing.sm,
  },
  quickConnectSubtitle: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    fontWeight: '500',
  },
  quickConnectContent: {
    padding: FreeShowTheme.spacing.lg,
  },
  
  // Discovery Section
  discoverySection: {
    marginBottom: FreeShowTheme.spacing.lg,
  },
  discoverySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: FreeShowTheme.spacing.md,
  },
  discoveryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoveryTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginLeft: FreeShowTheme.spacing.sm,
  },
  discoveryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.xl,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.secondary,
  },
  discoveryToggleActive: {
    backgroundColor: FreeShowTheme.colors.secondary,
    borderColor: FreeShowTheme.colors.secondary,
  },
  discoveryToggleText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.secondary,
    marginLeft: FreeShowTheme.spacing.xs,
  },
  discoveryToggleTextActive: {
    color: 'white',
  },
  discoveredDevices: {
    gap: FreeShowTheme.spacing.sm,
  },
  discoveredDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  discoveredDeviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FreeShowTheme.colors.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: FreeShowTheme.spacing.md,
  },
  discoveredDeviceInfo: {
    flex: 1,
  },
  discoveredDeviceIP: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
  discoveredDeviceStatus: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: 2,
  },
  discoveredDeviceAction: {
    padding: FreeShowTheme.spacing.xs,
  },
  emptyDiscovery: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.xl,
    paddingHorizontal: FreeShowTheme.spacing.lg,
  },
  emptyDiscoveryText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: FreeShowTheme.spacing.sm,
    fontStyle: 'italic',
  },
  
  // Recent Connections Section
  recentSection: {
    borderTopWidth: 1,
    borderTopColor: FreeShowTheme.colors.primaryLighter,
    paddingTop: FreeShowTheme.spacing.lg,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: FreeShowTheme.spacing.md,
  },
  recentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    marginLeft: FreeShowTheme.spacing.sm,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.sm,
    paddingHorizontal: FreeShowTheme.spacing.sm,
    paddingVertical: FreeShowTheme.spacing.xs,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  clearAllText: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: FreeShowTheme.colors.textSecondary,
    marginLeft: FreeShowTheme.spacing.xs,
    fontWeight: '500',
  },
  recentDevices: {
    gap: FreeShowTheme.spacing.sm,
  },
  recentDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primary + '80',
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '60',
  },
  deleteConnectionButton: {
    padding: FreeShowTheme.spacing.sm,
    marginLeft: FreeShowTheme.spacing.sm,
  },
  recentDeviceInfo: {
    flex: 1,
  },
  recentDeviceIP: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '500',
    color: FreeShowTheme.colors.text,
  },
  recentDeviceTime: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: 2,
  },

  // Card Styles
  mainCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.xl,
    marginBottom: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionsCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginBottom: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    overflow: 'hidden',
  },
  helpCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker + '80',
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '60',
  },
  cardTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  
  // Input Styles
  inputContainer: {
    marginBottom: FreeShowTheme.spacing.lg,
  },
  inputLabel: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 48,
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.primaryLighter,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingRight: 50,
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
  },
  inputAction: {
    position: 'absolute',
    right: FreeShowTheme.spacing.sm,
    padding: FreeShowTheme.spacing.sm,
  },
  
  // Advanced Settings
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: FreeShowTheme.spacing.md,
    marginBottom: FreeShowTheme.spacing.md,
  },
  advancedText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
  },
  advancedSection: {
    marginTop: FreeShowTheme.spacing.md,
  },
  portGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: FreeShowTheme.spacing.md,
  },
  portItem: {
    flex: 1,
    minWidth: '45%',
  },
  portLabel: {
    fontSize: FreeShowTheme.fontSize.xs,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  portInput: {
    height: 40,
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    paddingHorizontal: FreeShowTheme.spacing.sm,
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text,
    textAlign: 'center',
  },
  
  // Action Buttons
  actionContainer: {
    marginTop: FreeShowTheme.spacing.xl,
  },
  connectedActions: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.md,
    gap: FreeShowTheme.spacing.sm,
    minHeight: 48,
    flex: 1,
  },
  connectButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  connectingButton: {
    backgroundColor: '#FF9800',
  },
  shareButton: {
    backgroundColor: FreeShowTheme.colors.secondary + 'CC',
  },
  disconnectButton: {
    backgroundColor: FreeShowTheme.colors.disconnected,
  },
  buttonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },
  spinner: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: 'white',
    borderTopColor: 'transparent',
    borderRadius: 10,
  },
  
  // Quick Actions
  quickActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: FreeShowTheme.spacing.lg,
  },
  quickActionsContent: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.lg,
  },
  quickSection: {
    marginBottom: FreeShowTheme.spacing.lg,
  },
  quickSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: FreeShowTheme.spacing.md,
  },
  quickSectionTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
  },
  discoveryButton: {
    padding: FreeShowTheme.spacing.xs,
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    marginBottom: FreeShowTheme.spacing.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  quickItemIcon: {
    marginRight: FreeShowTheme.spacing.md,
  },
  quickItemContent: {
    flex: 1,
  },
  quickItemText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '500',
    color: FreeShowTheme.colors.text,
  },
  quickItemSubtext: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: FreeShowTheme.spacing.lg,
  },
  
  // Help Section
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.md,
  },
  helpTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginLeft: FreeShowTheme.spacing.sm,
  },
  helpText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    lineHeight: 20,
  },
});

export default ConnectScreen;


