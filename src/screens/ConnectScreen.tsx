import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { interfacePingService } from '../services/InterfacePingService';
import { configService } from '../config/AppConfig';
import ConfirmationModal from '../components/ConfirmationModal';
import ErrorModal from '../components/ErrorModal';
import Header from './ConnectScreen/Header';
import QuickConnectSection from './ConnectScreen/QuickConnectSection';
import ConnectionForm from './ConnectScreen/ConnectionForm';
import HelpSection from './ConnectScreen/HelpSection';
import EditNicknameModal from './ConnectScreen/EditNicknameModal';

interface ConnectScreenProps {
  navigation: any;
}

const ConnectScreen: React.FC<ConnectScreenProps> = ({ navigation }) => {
  const defaultPorts = configService.getDefaultShowPorts();
  
  const [host, setHost] = useState('192.168.1.100');
  const [remotePort, setRemotePort] = useState(String(defaultPorts?.remote ?? 5510));
  const [stagePort, setStagePort] = useState(String(defaultPorts?.stage ?? 5511));
  const [controlPort, setControlPort] = useState(String(defaultPorts?.control ?? 5512));
  const [outputPort, setOutputPort] = useState(String(defaultPorts?.output ?? 5513));
  const [apiPort, setApiPort] = useState(String(defaultPorts?.api ?? 5505));
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
  const [isPingingInterfaces, setIsPingingInterfaces] = useState(false);
  
  // Ref to track if we've already processed the history item
  const processedHistoryItemRef = useRef(false);
  
  // Use focused contexts
  const connection = useConnection();
  const { state, actions } = connection;
  const {
    isConnected,
    connectionStatus,
    connectionHost,
    connectionName,
    currentShowPorts,
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

  // Update host when connection changes
  useEffect(() => {
    if (isConnected && connectionHost) {
      setHost(connectionHost);
    }
  }, [isConnected, connectionHost]);

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
        Animated.timing(animatedScanProgress, {
          toValue: progress,
          duration: 50,
          useNativeDriver: false,
        }).start();
        if (progress >= 1) {
          clearInterval(scanTimerRef.current!);
          setScanComplete(true);
          setIsScanActive(false);
          stopDiscovery();
        }
      }, 50);
      return () => {
        if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      };
    } else {
      setScanProgress(0);
      animatedScanProgress.setValue(0);
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    }
  }, [isScanActive, discoveryTimeout, stopDiscovery, animatedScanProgress]);

  // When discovery stops for any reason, also end scan feedback
  useEffect(() => {
    if (!isDiscovering && isScanActive) {
      setIsScanActive(false);
    }
  }, [isDiscovering]);

  // Initialize port values when component mounts and when connection changes
  // Use a ref to track previous values to avoid infinite loops
  const prevShowPortsRef = useRef(currentShowPorts);

  useEffect(() => {
    // Only update port fields if show ports have actually changed
    if (currentShowPorts && 
        (prevShowPortsRef.current?.remote !== currentShowPorts.remote ||
         prevShowPortsRef.current?.stage !== currentShowPorts.stage ||
         prevShowPortsRef.current?.control !== currentShowPorts.control ||
         prevShowPortsRef.current?.output !== currentShowPorts.output ||
         prevShowPortsRef.current?.api !== currentShowPorts.api)) {
      
      // Update port fields based on current show ports
      setRemotePort(currentShowPorts.remote ? String(currentShowPorts.remote) : '');
      setStagePort(currentShowPorts.stage ? String(currentShowPorts.stage) : '');
      setControlPort(currentShowPorts.control ? String(currentShowPorts.control) : '');
      setOutputPort(currentShowPorts.output ? String(currentShowPorts.output) : '');
      setApiPort(currentShowPorts.api ? String(currentShowPorts.api) : '');
      
      // Update the ref with current values
      prevShowPortsRef.current = currentShowPorts;
    }
  }, [currentShowPorts]);

  // Remove this useEffect as the animation is now handled in the scan progress effect above

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

      // Ping host to check if it's reachable
      setIsPingingInterfaces(true);
      try {
        const pingResult = await interfacePingService.pingHost(sanitizedHost);
        
        if (!pingResult.isReachable) {
          setErrorModal({
            visible: true,
            title: 'Host Not Reachable',
            message: `Cannot reach ${sanitizedHost}. Please check that the host is online and accessible from your network.`
          });
          return;
        }

        ErrorLogger.info('Host ping successful', 'ConnectScreen', 
          new Error(`Host ${sanitizedHost} is reachable (${pingResult.responseTime}ms)`)
        );
      } finally {
        setIsPingingInterfaces(false);
      }

      // Find existing nickname before connecting
      const historyMatch = history.find(h => h.host === sanitizedHost);
      const nameToUse = historyMatch?.nickname;

      ErrorLogger.info('Attempting manual connection with validated inputs', 'ConnectScreen', 
        new Error(`Host: ${sanitizedHost}, Ports: ${JSON.stringify(sanitizedShowPorts)}`)
      );

      const connected = await connect(sanitizedHost, defaultPort, nameToUse);
      if (connected) {
        // Update show ports after successful connection
        await updateShowPorts(sanitizedShowPorts);
        
        // Save connection to history with show ports
        await settingsRepository.addToConnectionHistory(
          sanitizedHost,
          defaultPort,
          nameToUse,
          sanitizedShowPorts
        );
        
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
        setRemotePort(validatedShowPorts.remote ? String(validatedShowPorts.remote) : '');
        setStagePort(validatedShowPorts.stage ? String(validatedShowPorts.stage) : '');
        setControlPort(validatedShowPorts.control ? String(validatedShowPorts.control) : '');
        setOutputPort(validatedShowPorts.output ? String(validatedShowPorts.output) : '');
        setApiPort(validatedShowPorts.api ? String(validatedShowPorts.api) : '');
      } else {
        // Use default ports if none stored
        validatedShowPorts = configService.getDefaultShowPorts();
        setRemotePort(String(validatedShowPorts.remote));
        setStagePort(String(validatedShowPorts.stage));
        setControlPort(String(validatedShowPorts.control));
        setOutputPort(String(validatedShowPorts.output));
        setApiPort(String(validatedShowPorts.api));
      }
      
      // Ping host to check if it's reachable
      setIsPingingInterfaces(true);
      try {
        const pingResult = await interfacePingService.pingHost(sanitizedHost);
        
        if (!pingResult.isReachable) {
          setErrorModal({
            visible: true,
            title: 'Host Not Reachable',
            message: `Cannot reach ${sanitizedHost}. Please check that the host is online and accessible from your network.`
          });
          return;
        }
      } finally {
        setIsPingingInterfaces(false);
      }

      ErrorLogger.info('Attempting connection from history with validated inputs', 'ConnectScreen', 
        new Error(`Host: ${sanitizedHost}, Ports: ${JSON.stringify(validatedShowPorts)}`)
      );

      const defaultPort = configService.getNetworkConfig().defaultPort;
      const connected = await connect(sanitizedHost, defaultPort, historyItem.nickname);
      
      if (connected) {
        // Update show ports after successful connection
        await updateShowPorts(validatedShowPorts);
        // Navigate to Interface screen, handling both sidebar and bottom tab layouts
        if (navigation && typeof navigation.navigate === 'function') {
          navigation.navigate('Interface');
        } else {
          // For sidebar layout, we might not need to navigate since we're already on the Connect screen
          // The interface should update automatically based on the connection state
          ErrorLogger.debug('Connected successfully, but no navigation function available (likely in sidebar layout)', 'ConnectScreen');
        }
      }
    } catch (error) {
      ErrorLogger.error('History connection failed', 'ConnectScreen', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleDiscoveredConnect = async (service: any) => {
    // Check if any services are available for this instance
    if (!service.capabilities || service.capabilities.length === 0) {
      setErrorModal({
        visible: true,
        title: 'No Services Available',
        message: `The FreeShow instance "${service.name}" does not have any services enabled. Please enable at least one output in FreeShow settings.`,
      });
      return;
    }

    await proceedWithConnection(service);
  };

  const proceedWithConnection = async (service: any) => {
    // Use the IP address and default API port (5505) since API port is not broadcasted
    const ip = service.ip || service.host;
    const apiPort = 5505; // FreeShow API always uses default port 5505
    setHost(ip);
    stopDiscovery();
    
    try {
      // Use discovered ports if available, otherwise fall back to current form values
      // Treat missing ports as disabled (0)
      const showPorts = {
        remote: service.ports?.remote || 0,
        stage: service.ports?.stage || 0,
        control: service.ports?.control || 0,
        output: service.ports?.output || 0,
        api: apiPort,
      };
      
      // Check for a stored nickname for the discovered service
      const historyMatch = history.find(h => h.host === ip);
      const nameToUse = historyMatch?.nickname || service.name;
      
      const connected = await connect(ip, apiPort, nameToUse);
      if (connected) {
        // Update show ports after successful connection and save to history with capabilities
        await updateShowPorts(showPorts);
        
        // Update capabilities based on discovered services
        if (service.capabilities && service.capabilities.length > 0) {
          updateCapabilities(service.capabilities);
        } else {
          // Default capabilities if none discovered (manual connection)
          updateCapabilities(['api']);
        }
        
        // Save connection with discovered capabilities and show ports
        await settingsRepository.addToConnectionHistory(
          ip,
          apiPort,
          nameToUse,
          showPorts
        );
        
        // Navigate to Interface screen, handling both sidebar and bottom tab layouts
        if (navigation && typeof navigation.navigate === 'function') {
          navigation.navigate('Interface');
        } else {
          // For sidebar layout, we might not need to navigate since we're already on the Connect screen
          // The interface should update automatically based on the connection state
          ErrorLogger.debug('Connected successfully, but no navigation function available (likely in sidebar layout)', 'ConnectScreen');
        }
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

  // Handle navigation parameter for history item connection
  useEffect(() => {
    // Only add listener if navigation has addListener method (not available in sidebar layout)
    if (typeof navigation?.addListener === 'function') {
      const unsubscribe = navigation.addListener('focus', () => {
        const historyItem = navigation.getParam?.('historyItem');
        if (historyItem && !processedHistoryItemRef.current) {
          // Mark as processed to prevent multiple triggers
          processedHistoryItemRef.current = true;
          // Remove the parameter so it doesn't trigger again
          navigation.setParams?.({ historyItem: undefined });
          // Connect using the history item
          handleHistoryConnect(historyItem);
        }
      });

      return () => {
        unsubscribe();
        // Reset the ref when the effect is cleaned up
        processedHistoryItemRef.current = false;
      };
    }
    
    // For sidebar layout, check for historyItem on initial render
    const historyItem = navigation?.getParam?.('historyItem');
    if (historyItem && !processedHistoryItemRef.current) {
      // Mark as processed to prevent multiple triggers
      processedHistoryItemRef.current = true;
      // Remove the parameter so it doesn't trigger again
      navigation.setParams?.({ historyItem: undefined });
      // Connect using the history item
      handleHistoryConnect(historyItem);
    }
    
    // Return a cleanup function
    return () => {
      // Reset the ref when the effect is cleaned up
      processedHistoryItemRef.current = false;
    };
  }, [navigation, handleHistoryConnect]);

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
          await updateShowPorts(sanitizedShowPorts);
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
          <Header 
            isConnected={isConnected}
            connectionName={connectionName}
            connectionHost={connectionHost}
            connectionPulse={connectionPulse}
          />

          {/* Quick Connect Section - Premium placement */}
          {(history.length > 0 || discoveredServices.length > 0 || isDiscoveryAvailable) && (
            <QuickConnectSection
              history={history}
              discoveredServices={discoveredServices as DiscoveredFreeShowInstance[]}
              isDiscoveryAvailable={isDiscoveryAvailable}
              isDiscovering={isDiscovering}
              isScanActive={isScanActive}
              scanProgress={scanProgress}
              scanComplete={scanComplete}
              animatedScanProgress={animatedScanProgress}
              onScanPress={handleScanPress}
              onDiscoveredConnect={handleDiscoveredConnect}
              onHistoryConnect={handleHistoryConnect}
              onRemoveFromHistory={handleRemoveFromHistory}
              onEditNickname={handleEditNickname}
              onClearAllHistory={handleClearAllHistory}
            />
          )}

          <ConnectionForm
            host={host}
            setHost={setHost}
            remotePort={remotePort}
            setRemotePort={setRemotePort}
            stagePort={stagePort}
            setStagePort={setStagePort}
            controlPort={controlPort}
            setControlPort={setControlPort}
            outputPort={outputPort}
            setOutputPort={setOutputPort}
            apiPort={apiPort}
            setApiPort={setApiPort}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            isConnected={isConnected}
            isConnecting={isConnecting || isPingingInterfaces}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onCancelConnection={cancelConnection}
            onShowQRScanner={() => setShowQRScanner(true)}
            onShowShareQR={() => setShowShareQR(true)}
            navigation={navigation}
          />

          <HelpSection isConnected={isConnected} />
        </ScrollView>

        <EditNicknameModal
          visible={showEditNickname}
          editingConnection={editingConnection}
          editNicknameText={editNicknameText}
          setEditNicknameText={setEditNicknameText}
          onSave={handleSaveNickname}
          onCancel={handleCancelEdit}
        />

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
});

export default ConnectScreen;


