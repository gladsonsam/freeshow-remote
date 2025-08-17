import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection } from '../contexts';
import ShowSwitcher from '../components/ShowSwitcher';
import { ShowOption } from '../types';
import ErrorModal from '../components/ErrorModal';

interface APIScreenProps {
  route: {
    params?: {
      title?: string;
      showId?: string;
    };
  };
  navigation: any;
}

const APIScreen: React.FC<APIScreenProps> = ({ route, navigation }) => {
  const { state } = useConnection();
  const { connectionHost, isConnected, currentShowPorts } = state;
  const { title = 'FreeShow Remote' } = route.params || {};

  // State management
  const [socketConnected, setSocketConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Advanced mode state
  const [customCommand, setCustomCommand] = useState('');
  const [apiResponse, setApiResponse] = useState<string>('');
  const [shows, setShows] = useState<any[]>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const connectionErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownErrorRef = useRef<boolean>(false);
  const [errorModal, setErrorModal] = useState<{visible: boolean, title: string, message: string, onRetry?: () => void}>({
    visible: false,
    title: '',
    message: '',
    onRetry: undefined
  });

  useEffect(() => {
    if (isConnected && connectionHost) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isConnected, connectionHost]);

  const handleShowSelect = (show: ShowOption) => {
    navigation.navigate('WebView', {
      title: show.title,
      url: `http://${connectionHost}:${show.port}`,
      showId: show.id,
    });
  };

  const connectWebSocket = async () => {
    if (!connectionHost) return;

    try {
      hasShownErrorRef.current = false;
      console.log('Connecting to FreeShow WebSocket API...');
      
      if (connectionErrorTimeoutRef.current) {
        clearTimeout(connectionErrorTimeoutRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socketUrl = `http://${connectionHost}:5505`;
      socketRef.current = io(socketUrl, { 
        transports: ["websocket"],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketRef.current.on('connect', () => {
        console.log('FreeShow Remote connected successfully');
        setSocketConnected(true);
        
        if (connectionErrorTimeoutRef.current) {
          clearTimeout(connectionErrorTimeoutRef.current);
        }
        hasShownErrorRef.current = false;
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('FreeShow Remote disconnected:', reason);
        setSocketConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Connection error:', error);
        
        if (!hasShownErrorRef.current) {
          connectionErrorTimeoutRef.current = setTimeout(() => {
            if (!socketConnected && !hasShownErrorRef.current) {
              hasShownErrorRef.current = true;
              setErrorModal({
                visible: true,
                title: 'Connection Failed',
                message: `Cannot connect to FreeShow:\n\n${error.message}\n\nPlease check:\n• FreeShow is running\n• WebSocket/REST API is enabled\n• Port 5505 is accessible`,
                onRetry: () => {
                  hasShownErrorRef.current = false;
                  setErrorModal({visible: false, title: '', message: ''});
                  connectWebSocket();
                }
              });
            }
          }, 3000);
        }
      });

      socketRef.current.on('data', (response) => {
        handleApiResponse(response);
      });

    } catch (error) {
      console.error('Failed to setup WebSocket connection:', error);
      if (!hasShownErrorRef.current) {
        hasShownErrorRef.current = true;
        setErrorModal({
          visible: true,
          title: 'Setup Failed',
          message: `Failed to setup connection: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
  };

  const disconnectWebSocket = () => {
    if (connectionErrorTimeoutRef.current) {
      clearTimeout(connectionErrorTimeoutRef.current);
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocketConnected(false);
    hasShownErrorRef.current = false;
  };

  const handleApiResponse = (response: any) => {
    try {
      let data;
      if (typeof response === 'string') {
        try {
          data = JSON.parse(response);
        } catch {
          data = response;
        }
      } else {
        data = response;
      }

      console.log('API Response:', data);
      setApiResponse(JSON.stringify(data, null, 2));

      // Handle shows data for advanced mode
      if (data && typeof data === 'object' && isShowsData(data)) {
        const showsList: any[] = [];
        for (const [showId, showData] of Object.entries(data)) {
          if (showData && typeof showData === 'object') {
            showsList.push({
              id: showId,
              name: (showData as any).name || showId,
            });
          }
        }
        setShows(showsList);
      }
    } catch (error) {
      console.error('Error parsing API response:', error);
      setApiResponse(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const isShowsData = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    const firstKey = Object.keys(data)[0];
    if (!firstKey) return false;
    const firstItem = data[firstKey];
    return firstItem && (
      Object.prototype.hasOwnProperty.call(firstItem, 'name') || 
      Object.prototype.hasOwnProperty.call(firstItem, 'slides') ||
      Object.prototype.hasOwnProperty.call(firstItem, 'category')
    );
  };

  const sendApiCommand = async (action: string, data: any = {}, showAlert: boolean = true): Promise<void> => {
    if (!connectionHost || !socketRef.current || !socketRef.current.connected) {
      if (showAlert) {
        setErrorModal({
          visible: true,
          title: 'Error',
          message: 'Not connected to FreeShow'
        });
      }
      return;
    }

    try {
      setIsConnecting(true);
      const command = { action, ...data };
      console.log('Sending command:', command);
      socketRef.current.emit('data', JSON.stringify(command));
    } catch (error) {
      console.error('Command failed:', error);
      if (showAlert) {
        setErrorModal({
          visible: true,
          title: 'Command Failed',
          message: `Failed to execute "${action}"`
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Core remote functions
  const handleNextSlide = () => sendApiCommand('next_slide');
  const handlePreviousSlide = () => sendApiCommand('previous_slide');
  const handleNextProject = () => sendApiCommand('next_project_item');
  const handlePreviousProject = () => sendApiCommand('previous_project_item');
  const handleClearAll = () => sendApiCommand('clear_all');

  // Advanced functions
  const handleCustomCommand = () => {
    if (!customCommand.trim()) return;
    
    try {
      const parsed = JSON.parse(customCommand);
      if (parsed.action) {
        sendApiCommand(parsed.action, parsed.data || {}, false);
      } else {
        sendApiCommand(customCommand.trim(), {}, false);
      }
    } catch {
      sendApiCommand(customCommand.trim(), {}, false);
    }
  };

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="wifi-outline" size={64} color={FreeShowTheme.colors.textSecondary} />
          <Text style={styles.errorText}>Not connected to FreeShow</Text>
          <TouchableOpacity 
            style={styles.connectButton}
            onPress={() => navigation.navigate('Main', { screen: 'Connect' })}
          >
            <Text style={styles.connectButtonText}>Go to Connect</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
        </TouchableOpacity>
        
        <ShowSwitcher
          currentTitle={title}
          currentShowId="api"
          connectionHost={connectionHost || ''}
          showPorts={currentShowPorts || undefined}
          onShowSelect={handleShowSelect}
        />

        <View style={styles.headerRight}>
          {/* Connection dot removed as per request */}
        </View>
      </View>

      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Slide Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Slide Control</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.previousButton]}
              onPress={handlePreviousSlide}
              disabled={isConnecting || !socketConnected}
            >
              <Ionicons name="chevron-back" size={32} color="white" />
              <Text style={styles.controlButtonText}>Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.nextButton]}
              onPress={handleNextSlide}
              disabled={isConnecting || !socketConnected}
            >
              <Ionicons name="chevron-forward" size={32} color="white" />
              <Text style={styles.controlButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Project Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Control</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.projectButton]}
              onPress={handlePreviousProject}
              disabled={isConnecting || !socketConnected}
            >
              <Ionicons name="folder-open" size={24} color="white" />
              <Text style={styles.controlButtonText}>Previous Project</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.projectButton]}
              onPress={handleNextProject}
              disabled={isConnecting || !socketConnected}
            >
              <Ionicons name="folder" size={24} color="white" />
              <Text style={styles.controlButtonText}>Next Project</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Advanced Button */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced</Text>
          <TouchableOpacity
            style={[styles.advancedButton, !socketConnected && styles.advancedButtonDisabled]}
            onPress={() => setShowAdvanced(true)}
            disabled={!socketConnected}
          >
            <View style={styles.advancedButtonContent}>
              <Ionicons name="settings-outline" size={28} color="white" />
              <View style={styles.advancedButtonTextContainer}>
                <Text style={styles.advancedButtonTitle}>Advanced Controls</Text>
                <Text style={styles.advancedButtonSubtitle}>Access advanced API functions</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Clear All - Always at bottom */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={[styles.clearAllButton, !socketConnected && styles.clearAllButtonDisabled]}
          onPress={handleClearAll}
          disabled={isConnecting || !socketConnected}
        >
          <Ionicons name="close-circle" size={24} color="white" />
          <Text style={styles.clearAllButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      </View>

      {/* Loading Overlay */}
      {isConnecting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={FreeShowTheme.colors.secondary} />
        </View>
      )}

      {/* Advanced Modal */}
      <Modal
        visible={showAdvanced}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAdvanced(false)}
      >
        <SafeAreaView style={styles.advancedContainer}>
          <View style={styles.advancedHeader}>
            <Text style={styles.advancedTitle}>Advanced API Controls</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAdvanced(false)}
            >
              <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.advancedContent}>
            {/* Connection Status */}
            <View style={styles.advancedSection}>
              <Text style={styles.advancedSectionTitle}>Connection Status</Text>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>WebSocket:</Text>
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: socketConnected ? '#28a745' : '#dc3545' }]} />
                  <Text style={styles.statusText}>{socketConnected ? 'Connected' : 'Disconnected'}</Text>
                </View>
              </View>
            </View>

            {/* Quick Data Loading */}
            <View style={styles.advancedSection}>
              <Text style={styles.advancedSectionTitle}>Data Loading</Text>
              <View style={styles.advancedButtonRow}>
                <TouchableOpacity 
                  style={styles.advancedModalButton}
                  onPress={() => sendApiCommand('get_shows', {}, false)}
                  disabled={isConnecting || !socketConnected}
                >
                  <Text style={styles.advancedButtonText}>Load Shows</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.advancedModalButton}
                  onPress={() => sendApiCommand('get_projects', {}, false)}
                  disabled={isConnecting || !socketConnected}
                >
                  <Text style={styles.advancedButtonText}>Load Projects</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Custom Command */}
            <View style={styles.advancedSection}>
              <Text style={styles.advancedSectionTitle}>Custom API Command</Text>
              <View style={styles.customCommandContainer}>
                <TextInput
                  style={styles.customCommandInput}
                  value={customCommand}
                  onChangeText={setCustomCommand}
                  placeholder='e.g., get_shows or {"action":"get_slide","showId":"show1"}'
                  placeholderTextColor={FreeShowTheme.colors.textSecondary}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendButton, !customCommand.trim() && styles.sendButtonDisabled]}
                  onPress={handleCustomCommand}
                  disabled={isConnecting || !customCommand.trim() || !socketConnected}
                >
                  <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* API Response */}
            <View style={styles.advancedSection}>
              <Text style={styles.advancedSectionTitle}>API Response</Text>
              <ScrollView style={styles.responseContainer} nestedScrollEnabled>
                <Text style={styles.responseText}>{apiResponse || 'No response yet'}</Text>
              </ScrollView>
            </View>

            {/* Shows List (if loaded) */}
            {shows.length > 0 && (
              <View style={styles.advancedSection}>
                <Text style={styles.advancedSectionTitle}>Shows ({shows.length})</Text>
                {shows.slice(0, 10).map((show) => (
                  <TouchableOpacity
                    key={show.id}
                    style={styles.showItem}
                    onPress={() => sendApiCommand('name_select_show', { value: show.name }, false)}
                    disabled={isConnecting}
                  >
                    <Text style={styles.showItemText}>{show.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color={FreeShowTheme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
                {shows.length > 10 && (
                  <Text style={styles.moreItemsText}>... and {shows.length - 10} more shows</Text>
                )}
              </View>
            )}

            {/* Clear All in Advanced Mode too */}
            <View style={styles.advancedSection}>
              <TouchableOpacity 
                style={[styles.clearAllButton, !socketConnected && styles.clearAllButtonDisabled]}
                onPress={handleClearAll}
                disabled={isConnecting || !socketConnected}
              >
                <Ionicons name="close-circle" size={24} color="white" />
                <Text style={styles.clearAllButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Error Modal */}
      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        buttonText={errorModal.onRetry ? 'Retry' : 'OK'}
        onClose={() => {
          if (errorModal.onRetry) {
            errorModal.onRetry();
          } else {
            setErrorModal({visible: false, title: '', message: ''});
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  closeButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: FreeShowTheme.spacing.md,
  },
  title: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.md,
  },
  headerAdvancedButton: {
    padding: FreeShowTheme.spacing.sm,
    marginLeft: FreeShowTheme.spacing.sm,
  },
  content: {
    flex: 1,
    padding: FreeShowTheme.spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.xl,
  },
  errorText: {
    fontSize: FreeShowTheme.fontSize.lg,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: FreeShowTheme.spacing.lg,
    textAlign: 'center',
  },
  connectButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingHorizontal: FreeShowTheme.spacing.xl,
    paddingVertical: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginTop: FreeShowTheme.spacing.xl,
  },
  connectButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },
  section: {
    marginBottom: FreeShowTheme.spacing.xl * 1.5,
  },
  sectionTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  // Control Buttons
  controlRow: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.lg,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.xl,
    borderRadius: FreeShowTheme.borderRadius.lg,
    gap: FreeShowTheme.spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  controlButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },
  previousButton: {
    backgroundColor: '#FF851B',
  },
  nextButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  projectButton: {
    backgroundColor: '#007bff',
  },
  // Advanced Button
  advancedButton: {
    backgroundColor: '#333',
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  advancedButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  advancedButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  advancedButtonTextContainer: {
    flex: 1,
    marginLeft: FreeShowTheme.spacing.lg,
    marginRight: FreeShowTheme.spacing.md,
  },
  advancedButtonTitle: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    marginBottom: FreeShowTheme.spacing.xs,
  },
  advancedButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: FreeShowTheme.fontSize.sm,
  },
  // Bottom Section
  bottomSection: {
    padding: FreeShowTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: FreeShowTheme.colors.primaryLighter,
  },
  clearAllButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    gap: FreeShowTheme.spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  clearAllButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  clearAllButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Advanced Modal Styles
  advancedContainer: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  advancedTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
  advancedContent: {
    flex: 1,
    padding: FreeShowTheme.spacing.lg,
  },
  advancedSection: {
    marginBottom: FreeShowTheme.spacing.xl,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  advancedSectionTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    fontWeight: '600',
  },
  advancedButtonRow: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.md,
  },
  advancedModalButton: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.md,
    alignItems: 'center',
  },
  advancedButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
  },
  customCommandContainer: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.md,
    alignItems: 'flex-start',
  },
  customCommandInput: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    color: FreeShowTheme.colors.text,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    maxHeight: 100,
    fontSize: FreeShowTheme.fontSize.sm,
  },
  sendButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  responseContainer: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    maxHeight: 200,
  },
  responseText: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: FreeShowTheme.colors.text,
    fontFamily: 'monospace',
  },
  showItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.md,
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    marginBottom: FreeShowTheme.spacing.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  showItemText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text,
    fontWeight: '500',
  },
  moreItemsText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
    padding: FreeShowTheme.spacing.md,
    fontStyle: 'italic',
  },
});

export default APIScreen; 