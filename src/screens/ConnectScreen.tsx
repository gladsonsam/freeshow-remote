import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import {
  useConnection,
  useDiscovery,
  useSettings,
  useDiscoveryActions,
} from '../contexts';
import { DiscoveredFreeShowInstance } from '../services/AutoDiscoveryService';
import { ConnectionHistory, settingsRepository } from '../repositories';
import QRScannerModal from '../components/QRScannerModal';
import { ErrorLogger } from '../services/ErrorLogger';
import ShareQRModal from '../components/ShareQRModal';
import { ValidationService } from '../services/InputValidationService';
import { configService } from '../config/AppConfig';
import ConfirmationModal from '../components/ConfirmationModal';
import ErrorModal from '../components/ErrorModal';

interface ConnectScreenProps {
  navigation: any;
}

const ConnectScreen: React.FC<ConnectScreenProps> = ({ navigation }) => {
  const defaultPorts = configService.getDefaultShowPorts();
  
  const [host, setHost] = useState('192.168.1.100');
  const [remotePort, setRemotePort] = useState(defaultPorts.remote.toString());
  const [stagePort, setStagePort] = useState(defaultPorts.stage.toString());
  const [controlPort, setControlPort] = useState(defaultPorts.control.toString());
  const [outputPort, setOutputPort] = useState(defaultPorts.output.toString());
  const [apiPort, setApiPort] = useState(defaultPorts.api.toString());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showShareQR, setShowShareQR] = useState(false);
  const [showEditNickname, setShowEditNickname] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionHistory | null>(null);
  const [editNicknameText, setEditNicknameText] = useState('');
  const [connectionPulse] = useState(new Animated.Value(1));
  const [animatedScanProgress] = useState(new Animated.Value(0));
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [errorModal, setErrorModal] = useState<{visible: boolean, title: string, message: string}>({
    visible: false,
    title: '',
    message: ''
  });
  
  // Use focused contexts
  const connection = useConnection();
  const { state, actions } = connection;
  const {
    isConnected,
    connectionStatus,
    connectionHost,
    connectionName,
    currentShowPorts
  } = state;
  const {
    connect,
    disconnect,
    updateShowPorts,
    updateCapabilities,
    cancelConnection
  } = actions;
  
  const { history, actions: historyActions } = useSettings();
  
  const discovery = useDiscovery();
  const discoveryActions = useDiscoveryActions();
  const { state: discoveryState } = discovery;
  const { discoveredServices, isDiscovering, isDiscoveryAvailable } = discoveryState;
  const { startDiscovery, stopDiscovery, clearDiscoveredServices } = discoveryActions;

  // Progress state for scan
  const discoveryTimeout = configService.getNetworkConfig().discoveryTimeout;
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [isScanActive, setIsScanActive] = useState(false);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear discovered services and progress when screen mounts
  useEffect(() => {
    clearDiscoveredServices();
    setScanProgress(0);
    setScanComplete(false);
  }, []);

  // Handle scan progress
  useEffect(() => {
    if (isScanActive) {
      setScanProgress(0);
      setScanComplete(false);
      const start = Date.now();
      scanTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / discoveryTimeout, 1);
        setScanProgress(progress);
        if (progress >= 1) {
          clearInterval(scanTimerRef.current!);
          setScanComplete(true);
          setIsScanActive(false);
          stopDiscovery();
        }
      }, 50);
      return () => clearInterval(scanTimerRef.current!);
    } else {
      setScanProgress(0);
      animatedScanProgress.setValue(0);
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    }
  }, [isScanActive, discoveryTimeout, stopDiscovery]);

  // When discovery stops for any reason, also end scan feedback
  useEffect(() => {
    if (!isDiscovering && isScanActive) {
      setIsScanActive(false);
    }
  }, [isDiscovering]);

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
      ErrorLogger.debug('Updating form with current connection', 'ConnectScreen', { connectionHost });
      setHost(connectionHost);
    }
  }, [isConnected, connectionHost, history]);

  // Update current show ports whenever port values change and we're connected
  useEffect(() => {
    if (isConnected) {
      const showPorts = {
        remote: parseInt(remotePort) || 5510,
        stage: parseInt(stagePort) || 5511,
        control: parseInt(controlPort) || 5512,
        output: parseInt(outputPort) || 5513,
        api: parseInt(apiPort) || 5505,
      };
      updateShowPorts(showPorts);
    }
  }, [isConnected, remotePort, stagePort, controlPort, outputPort, apiPort]);

  // In the scan progress effect, animate the fill smoothly
  useEffect(() => {
    if (isScanActive) {
      Animated.timing(animatedScanProgress, {
        toValue: scanProgress,
        duration: 100,
        useNativeDriver: false,
      }).start();
    } else {
      // Reset animation when not scanning
      animatedScanProgress.setValue(0);
    }
  }, [scanProgress, isScanActive]);

  const handleConnect = async () => {
    try {
      // Validate host input
      const hostValidation = ValidationService.validateHost(host.trim());
      if (!hostValidation.isValid) {
        setErrorModal({
          visible: true,
          title: 'Invalid Host',
          message: hostValidation.error || 'Please enter a valid host address'
        });
        return;
      }

      // Validate show ports
      const portsToValidate = {
        remote: remotePort,
        stage: stagePort,
        control: controlPort,
        output: outputPort,
        api: apiPort,
      };

      const validatedPorts: any = {};
      for (const [portName, portValue] of Object.entries(portsToValidate)) {
        const portValidation = ValidationService.validatePort(portValue);
        if (!portValidation.isValid) {
          setErrorModal({
            visible: true,
            title: 'Invalid Port',
            message: `${portName.charAt(0).toUpperCase() + portName.slice(1)} port: ${portValidation.error}`
          });
          return;
        }
        validatedPorts[portName] = portValidation.sanitizedValue;
      }

      // Additional validation for show ports as a group
      const showPortsValidation = ValidationService.validateShowPorts(validatedPorts);
      if (!showPortsValidation.isValid) {
        setErrorModal({
          visible: true,
          title: 'Port Configuration Error',
          message: showPortsValidation.error || 'Invalid port configuration'
        });
        return;
      }

      // Use sanitized values for connection
      const sanitizedHost = hostValidation.sanitizedValue as string;
      const sanitizedShowPorts = showPortsValidation.sanitizedValue;
      const defaultPort = configService.getNetworkConfig().defaultPort;

      // Find existing nickname before connecting
      const historyMatch = history.find(h => h.host === sanitizedHost);
      const nameToUse = historyMatch?.nickname;

      ErrorLogger.info('Attempting manual connection with validated inputs', 'ConnectScreen', 
        new Error(`Host: ${sanitizedHost}, Ports: ${JSON.stringify(sanitizedShowPorts)}`)
      );

      const connected = await connect(sanitizedHost, defaultPort, nameToUse);
      if (connected) {
        // Update show ports after successful connection
        updateShowPorts(sanitizedShowPorts);
        navigation.navigate('Interface');
      }
    } catch (error) {
      ErrorLogger.error('Manual connection failed', 'ConnectScreen', error instanceof Error ? error : new Error(String(error)));
      setErrorModal({
        visible: true,
        title: 'Connection Error',
        message: 'Failed to connect to FreeShow. Please check your connection and try again.'
      });
    }
  };

  const handleHistoryConnect = async (historyItem: any) => {
    try {
      // Validate host from history
      const hostValidation = ValidationService.validateHost(historyItem.host);
      if (!hostValidation.isValid) {
        setErrorModal({
          visible: true,
          title: 'Invalid Host',
          message: `History item has invalid host: ${hostValidation.error}`
        });
        return;
      }

      // Update UI with history item data
      const sanitizedHost = hostValidation.sanitizedValue as string;
      setHost(sanitizedHost);
      
      // Validate and update interface ports from stored history
      let validatedShowPorts;
      
      if (historyItem.showPorts) {
        const showPortsValidation = ValidationService.validateShowPorts(historyItem.showPorts);
        if (!showPortsValidation.isValid) {
          ErrorLogger.warn('History item has invalid show ports, using defaults', 'ConnectScreen', 
            new Error(`Invalid ports: ${JSON.stringify(historyItem.showPorts)}`)
          );
          validatedShowPorts = configService.getDefaultShowPorts();
        } else {
          validatedShowPorts = showPortsValidation.sanitizedValue;
        }
        
        // Update UI with validated ports
        setRemotePort(validatedShowPorts.remote.toString());
        setStagePort(validatedShowPorts.stage.toString());
        setControlPort(validatedShowPorts.control.toString());
        setOutputPort(validatedShowPorts.output.toString());
        setApiPort(validatedShowPorts.api.toString());
      } else {
        // Use default ports if none stored
        validatedShowPorts = configService.getDefaultShowPorts();
        setRemotePort(validatedShowPorts.remote.toString());
        setStagePort(validatedShowPorts.stage.toString());
        setControlPort(validatedShowPorts.control.toString());
        setOutputPort(validatedShowPorts.output.toString());
        setApiPort(validatedShowPorts.api.toString());
      }
      
      ErrorLogger.info('Attempting connection from history with validated inputs', 'ConnectScreen', 
        new Error(`Host: ${sanitizedHost}, Ports: ${JSON.stringify(validatedShowPorts)}`)
      );

      const defaultPort = configService.getNetworkConfig().defaultPort;
      const connected = await connect(sanitizedHost, defaultPort, historyItem.nickname);
      
      if (connected) {
        // Update show ports after successful connection
        updateShowPorts(validatedShowPorts);
        navigation.navigate('Interface');
      }
    } catch (error) {
      ErrorLogger.error('History connection failed', 'ConnectScreen', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleDiscoveredConnect = async (service: any) => {
    // Check if API is available for this service
    if (service.apiEnabled === false) {
      setErrorModal({
        visible: true,
        title: 'API Not Available',
        message: `The FreeShow instance "${service.name}" does not have the API enabled. Please enable the API in FreeShow settings to use the remote control features.`,
      });
      return;
    }

    await proceedWithConnection(service);
  };

  const proceedWithConnection = async (service: any) => {
    // Use the IP address and discovered API port if available
    const ip = service.ip || service.host;
    const apiPort = service.ports?.api || 5505; // Use discovered API port or default
    setHost(ip);
    stopDiscovery();
    
    try {
      // Use discovered ports if available, otherwise fall back to current form values
      const showPorts = {
        remote: service.ports?.remote || parseInt(remotePort),
        stage: service.ports?.stage || parseInt(stagePort),
        control: service.ports?.control || parseInt(controlPort),
        output: service.ports?.output || parseInt(outputPort),
        api: apiPort,
      };
      
      // Check for a stored nickname for the discovered service
      const historyMatch = history.find(h => h.host === ip);
      const nameToUse = historyMatch?.nickname || service.name;
      
      const connected = await connect(ip, apiPort, nameToUse);
      if (connected) {
        // Update show ports after successful connection and save to history with capabilities
        updateShowPorts(showPorts);
        
        // Update capabilities based on discovered services
        if (service.capabilities && service.capabilities.length > 0) {
          updateCapabilities(service.capabilities);
        } else {
          // Default capabilities if none discovered (manual connection)
          updateCapabilities(['api']);
        }
        
        // Save connection with discovered capabilities
        await settingsRepository.addToConnectionHistory(
          ip,
          apiPort,
          nameToUse,
          showPorts
        );
        
        navigation.navigate('Interface');
      }
    } catch (error) {
      ErrorLogger.error('Discovered service connection failed', 'ConnectScreen', error instanceof Error ? error : new Error(String(error)));
      setErrorModal({
        visible: true,
        title: 'Connection Error',
        message: `Failed to connect to "${service.name}". Please ensure FreeShow is running and the API is enabled.`
      });
    }
  };

  const handleRemoveFromHistory = async (itemId: string) => {
    await historyActions.removeFromHistory(itemId);
  };

  const handleEditNickname = (item: ConnectionHistory) => {
    setEditingConnection(item);
    setEditNicknameText(item.nickname || item.host);
    setShowEditNickname(true);
  };

  const handleSaveNickname = async () => {
    if (!editingConnection) return;
    
    try {
      await settingsRepository.updateConnectionNickname(editingConnection.id, editNicknameText);
      await historyActions.refreshHistory(); // Use the destructured action
      setShowEditNickname(false);
      setEditingConnection(null);
      setEditNicknameText('');
    } catch (error) {
      console.error('Failed to update nickname:', error);
      setErrorModal({
        visible: true,
        title: 'Error',
        message: 'Failed to update connection name'
      });
    }
  };

  const handleCancelEdit = () => {
    setShowEditNickname(false);
    setEditingConnection(null);
    setEditNicknameText('');
  };

  const handleClearAllHistory = () => {
    setShowClearAllConfirm(true);
  };

  const confirmClearAllHistory = async () => {
    await historyActions.clearHistory();
    setShowClearAllConfirm(false);
  };

  const cancelClearAllHistory = () => {
    setShowClearAllConfirm(false);
  };

  // Update: Scan button clears results and rescans, or cancels if already scanning
  const handleScanPress = () => {
    if (isScanActive) {
      // Cancel scanning
      stopDiscovery();
      setIsScanActive(false);
      setScanProgress(0);
      setScanComplete(false);
      animatedScanProgress.setValue(0);
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
      }
    } else {
      // Start scanning
      clearDiscoveredServices();
      setScanProgress(0);
      setScanComplete(false);
      setIsScanActive(true);
      // Reset animated progress
      animatedScanProgress.setValue(0);
      startDiscovery();
    }
  };

  const handleQRScan = async (scannedContent: string) => {
    try {
      // Validate QR content
      const qrValidation = ValidationService.validateQRContent(scannedContent);
      if (!qrValidation.isValid) {
        setErrorModal({
          visible: true,
          title: 'Invalid QR Code',
          message: qrValidation.error || 'The QR code contains invalid content'
        });
        setShowQRScanner(false);
        return;
      }

      const sanitizedContent = qrValidation.sanitizedValue as string;
      
      // Extract host from URL if it's a full URL, otherwise use as-is
      let extractedHost = sanitizedContent;
      try {
        const url = new URL(sanitizedContent);
        extractedHost = url.hostname;
      } catch {
        // Not a URL, use the content as-is (should be an IP or hostname)
      }

      // Final validation of the extracted host
      const hostValidation = ValidationService.validateHost(extractedHost);
      if (!hostValidation.isValid) {
        setErrorModal({
          visible: true,
          title: 'Invalid Host',
          message: `QR code contains invalid host: ${hostValidation.error}`
        });
        setShowQRScanner(false);
        return;
      }

      const validatedHost = hostValidation.sanitizedValue as string;

      ErrorLogger.info('QR scan successful - auto-connecting', 'ConnectScreen', 
        new Error(`Scanned: ${scannedContent}, Extracted: ${validatedHost}`)
      );

      // Update UI with scanned host
      setHost(validatedHost);
      setShowQRScanner(false);

      // Auto-connect after QR scan
      try {
        // Validate current port configuration for auto-connect
        const portsToValidate = {
          remote: remotePort,
          stage: stagePort,
          control: controlPort,
          output: outputPort,
          api: apiPort,
        };

        const validatedPorts: any = {};
        for (const [portName, portValue] of Object.entries(portsToValidate)) {
          const portValidation = ValidationService.validatePort(portValue);
          if (!portValidation.isValid) {
            setErrorModal({
              visible: true,
              title: 'Connection Error',
              message: `Invalid ${portName} port configuration. Please check your port settings and try again.`
            });
            return;
          }
          validatedPorts[portName] = portValidation.sanitizedValue;
        }

        // Additional validation for show ports as a group
        const showPortsValidation = ValidationService.validateShowPorts(validatedPorts);
        if (!showPortsValidation.isValid) {
          setErrorModal({
            visible: true,
            title: 'Port Configuration Error',
            message: showPortsValidation.error || 'Invalid port configuration. Please check your settings.'
          });
          return;
        }

        const sanitizedShowPorts = showPortsValidation.sanitizedValue;
        const defaultPort = configService.getNetworkConfig().defaultPort;

        // Find existing nickname before connecting
        const historyMatch = history.find(h => h.host === validatedHost);
        const nameToUse = historyMatch?.nickname;

        ErrorLogger.info('Attempting auto-connection from QR scan', 'ConnectScreen', 
          new Error(`Host: ${validatedHost}, Ports: ${JSON.stringify(sanitizedShowPorts)}`)
        );

        const connected = await connect(validatedHost, defaultPort, nameToUse);

        if (connected) {
          // Update show ports after successful connection
          updateShowPorts(sanitizedShowPorts);
          navigation.navigate('Interface');
        }
      } catch (connectionError) {
        ErrorLogger.error('Auto-connection from QR scan failed', 'ConnectScreen',
          connectionError instanceof Error ? connectionError : new Error(String(connectionError))
        );
        setErrorModal({
          visible: true,
          title: 'Connection Failed',
          message: 'Could not connect to the scanned FreeShow instance. Please check that FreeShow is running and try again.'
        });
      }
    } catch (error) {
      ErrorLogger.error('QR scan processing failed', 'ConnectScreen', error instanceof Error ? error : new Error(String(error)));
      setErrorModal({
        visible: true,
        title: 'QR Scan Error',
        message: 'Failed to process QR code content'
      });
      setShowQRScanner(false);
    }
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
        text: `Connected to ${connectionName || connectionHost}`,
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

  // Utility to check if a string is an IP address
  const isIpAddress = (str: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(str);

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
          {!isConnected && (history.length > 0 || discoveredServices.length > 0 || isDiscoveryAvailable) && (
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
                        onPress={handleScanPress}
                        style={[
                          styles.discoveryToggle,
                          isScanActive && styles.discoveryToggleActive,
                          { overflow: 'hidden', position: 'relative' },
                        ]}
                      >
                        {/* Progress fill overlay */}
                        {isScanActive && (
                          <Animated.View
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: animatedScanProgress.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                              }),
                              backgroundColor: FreeShowTheme.colors.secondary,
                              opacity: 0.3,
                              borderRadius: 20,
                              zIndex: 1,
                            }}
                          />
                        )}
                        {/* Icon and label */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 2 }}>
                          <Ionicons
                            name={isScanActive ? 'stop' : 'search'}
                            size={16}
                            color={isScanActive ? 'white' : FreeShowTheme.colors.secondary}
                          />
                          <Text
                            style={[
                              styles.discoveryToggleText,
                              isScanActive && styles.discoveryToggleTextActive,
                              { marginLeft: 6 },
                            ]}
                          >
                            {isScanActive ? 'Scanning...' : 'Scan'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                    {discoveredServices.length > 0 ? (
                      <View style={styles.discoveredDevices}>
                        {discoveredServices.map((service: DiscoveredFreeShowInstance, index: number) => {
                          const showHost = service.host && !isIpAddress(service.host);
                          return (
                            <TouchableOpacity
                              key={service.ip}
                              style={[
                                styles.discoveredDevice,
                                service.apiEnabled === false && styles.discoveredDeviceDisabled
                              ]}
                              onPress={() => handleDiscoveredConnect(service)}
                              disabled={service.apiEnabled === false}
                            >
                              <View style={styles.discoveredDeviceIcon}>
                                <Ionicons 
                                  name="desktop" 
                                  size={18} 
                                  color={service.apiEnabled === false ? FreeShowTheme.colors.textSecondary : FreeShowTheme.colors.secondary} 
                                />
                              </View>
                              <View style={styles.discoveredDeviceInfo}>
                                <Text style={[
                                  styles.discoveredDeviceIP,
                                  service.apiEnabled === false && styles.discoveredDeviceTextDisabled
                                ]}>
                                  {service.name || (showHost ? service.host : service.ip)}
                                </Text>
                                {showHost && (
                                  <Text style={[
                                    styles.discoveredDeviceStatus,
                                    service.apiEnabled === false && styles.discoveredDeviceTextDisabled
                                  ]}>
                                    {service.ip}
                                  </Text>
                                )}
                                {/* Show capabilities */}
                                <View style={styles.capabilitiesContainer}>
                                  {service.apiEnabled === false ? (
                                    <Text style={styles.capabilityBadgeDisabled}>API Disabled</Text>
                                  ) : (
                                    <>
                                      {service.ports?.api && (
                                        <Text style={styles.capabilityBadge}>API:{service.ports.api}</Text>
                                      )}
                                      {service.ports?.remote && (
                                        <Text style={styles.capabilityBadge}>Remote:{service.ports.remote}</Text>
                                      )}
                                      {service.ports?.stage && (
                                        <Text style={styles.capabilityBadge}>Stage:{service.ports.stage}</Text>
                                      )}
                                      {service.ports?.control && (
                                        <Text style={styles.capabilityBadge}>Control:{service.ports.control}</Text>
                                      )}
                                      {service.ports?.output && (
                                        <Text style={styles.capabilityBadge}>Output:{service.ports.output}</Text>
                                      )}
                                    </>
                                  )}
                                </View>
                              </View>
                              <View style={styles.discoveredDeviceAction}>
                                <Ionicons 
                                  name={service.apiEnabled === false ? "ban-outline" : "arrow-forward-circle"} 
                                  size={24} 
                                  color={service.apiEnabled === false ? FreeShowTheme.colors.textSecondary : FreeShowTheme.colors.secondary} 
                                />
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.emptyDiscovery}>
                        {scanComplete && !isScanActive ? (
                          <>
                            <Ionicons name="alert-circle-outline" size={24} color={FreeShowTheme.colors.textSecondary} />
                            <Text style={styles.emptyDiscoveryText}>No devices found</Text>
                          </>
                        ) : (
                          <>
                            <Ionicons name="search-outline" size={24} color={FreeShowTheme.colors.textSecondary} />
                            <Text style={styles.emptyDiscoveryText}>Tap scan to find devices</Text>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Recent Connections */}
                {history.length > 0 && (
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
                      {history.slice(0, 3).map((item: ConnectionHistory, index: number) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.recentDevice}
                          onPress={() => handleHistoryConnect(item)}
                        >
                          <View style={styles.recentDeviceInfo}>
                            <Text style={styles.recentDeviceIP}>{item.nickname || item.host}</Text>
                            <Text style={styles.recentDeviceTime}>
                              {item.nickname && item.nickname !== item.host ? `${item.host} • ` : ''}{new Date(item.lastUsed).toLocaleDateString()}
                            </Text>
                          </View>
                          <View style={styles.recentDeviceActions}>
                            <TouchableOpacity
                              style={styles.editConnectionButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleEditNickname(item);
                              }}
                            >
                              <Ionicons name="create-outline" size={16} color={FreeShowTheme.colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteConnectionButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleRemoveFromHistory(item.id);
                              }}
                            >
                              <Ionicons name="trash-outline" size={16} color={FreeShowTheme.colors.textSecondary} />
                            </TouchableOpacity>
                          </View>
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
                      editable={!isConnected}
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
                      editable={!isConnected}
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
                      editable={!isConnected}
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
                      editable={!isConnected}
                    />
                  </View>

                  <View style={styles.portItem}>
                    <Text style={styles.portLabel}>API</Text>
                    <TextInput
                      style={styles.portInput}
                      value={apiPort}
                      onChangeText={setApiPort}
                      placeholder="5505"
                      placeholderTextColor={FreeShowTheme.colors.textSecondary}
                      keyboardType="numeric"
                      maxLength={5}
                      editable={!isConnected}
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
                isConnecting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.connectingButton]}
                      disabled
                    >
                      <View style={styles.spinner} />
                      <Text style={styles.buttonText}>Connecting...</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={cancelConnection}
                    >
                      <Ionicons name="close-circle-outline" size={20} color="white" />
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.connectButton]}
                    onPress={handleConnect}
                  >
                    <Ionicons name="wifi" size={20} color="white" />
                    <Text style={styles.buttonText}>Connect</Text>
                  </TouchableOpacity>
                )
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

        {/* Edit Nickname Modal */}
        <Modal
          visible={showEditNickname}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCancelEdit}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.editModalContent}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>Edit Connection Name</Text>
                <TouchableOpacity
                  style={styles.editModalCloseButton}
                  onPress={handleCancelEdit}
                >
                  <Ionicons name="close" size={24} color={FreeShowTheme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.editModalBody}>
                <Text style={styles.editModalLabel}>
                  Connection: {editingConnection?.host}
                </Text>
                <TextInput
                  style={styles.editModalInput}
                  value={editNicknameText}
                  onChangeText={setEditNicknameText}
                  placeholder="Enter connection name"
                  placeholderTextColor={FreeShowTheme.colors.textSecondary}
                  autoFocus={true}
                  selectTextOnFocus={true}
                />
              </View>
              
              <View style={styles.editModalButtons}>
                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalCancelButton]}
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.editModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalSaveButton]}
                  onPress={handleSaveNickname}
                >
                  <Text style={styles.editModalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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

        {/* Clear All History Confirmation Modal */}
        <ConfirmationModal
          visible={showClearAllConfirm}
          title="Clear All History"
          message="Are you sure you want to remove all connection history? This action cannot be undone."
          confirmText="Clear All"
          cancelText="Cancel"
          confirmStyle="destructive"
          icon="warning-outline"
          onConfirm={confirmClearAllHistory}
          onCancel={cancelClearAllHistory}
        />

        {/* Error Modal */}
        <ErrorModal
          visible={errorModal.visible}
          title={errorModal.title}
          message={errorModal.message}
          onClose={() => setErrorModal({visible: false, title: '', message: ''})}
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
    backgroundColor: 'transparent',
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
  discoveredDeviceDisabled: {
    opacity: 0.5,
  },
  discoveredDeviceTextDisabled: {
    color: FreeShowTheme.colors.textSecondary,
  },
  capabilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  capabilityBadge: {
    fontSize: 10,
    color: FreeShowTheme.colors.secondary,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  capabilityBadgeDisabled: {
    fontSize: 10,
    color: FreeShowTheme.colors.textSecondary,
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    overflow: 'hidden',
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
  recentDeviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editConnectionButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  deleteConnectionButton: {
    padding: FreeShowTheme.spacing.sm,
    marginLeft: FreeShowTheme.spacing.xs,
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
  cancelButton: {
    backgroundColor: FreeShowTheme.colors.disconnected,
    marginLeft: FreeShowTheme.spacing.md,
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
  
  // Edit Modal Styles  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    margin: FreeShowTheme.spacing.lg,
    minWidth: 280,
    maxWidth: 400,
    width: '80%',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.lg,
  },
  editModalTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
  editModalCloseButton: {
    padding: FreeShowTheme.spacing.xs,
  },
  editModalBody: {
    marginBottom: FreeShowTheme.spacing.lg,
  },
  editModalLabel: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  editModalInput: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: FreeShowTheme.spacing.sm,
  },
  editModalButton: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  editModalCancelButton: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  editModalSaveButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  editModalCancelText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    fontWeight: '500',
  },
  editModalSaveText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    fontWeight: '600',
  },
});

export default ConnectScreen;


