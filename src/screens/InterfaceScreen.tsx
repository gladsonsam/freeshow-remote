import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

import { useConnection, useSettings } from '../contexts';
import { ShowOption } from '../types';
import { configService } from '../config/AppConfig';
import ConfirmationModal from '../components/ConfirmationModal';
import ErrorModal from '../components/ErrorModal';
import CompactPopup from '../components/CompactPopup';
import EnableInterfaceModal from '../components/EnableInterfaceModal';
import InterfaceHeader from '../components/InterfaceHeader';
import InterfaceCard from '../components/InterfaceCard';
// Interface configuration methods are now available through configService
import { useInterfaceNavigation } from '../hooks/useInterfaceNavigation';
import { useModalState } from '../hooks/useModalState';
import { useAppLaunch } from '../hooks/useAppLaunch';

interface InterfaceScreenProps {
  navigation: any;
}

/**
 * Interface Screen - Main interface for FreeShow remote control
 * Displays available interfaces and handles navigation between them
 */
const InterfaceScreen: React.FC<InterfaceScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 768;
  const { state, actions } = useConnection();
  const { settings } = useSettings();

  // Check if we're using floating navigation layout
  const isFloatingNav = settings?.navigationLayout === 'floating';

  const { isConnected, connectionHost, connectionName, currentShowPorts, autoConnectAttempted, connectionStatus } = state;
  const { disconnect, updateShowPorts } = actions;

  // Separate animation values for main content to avoid being consumed by placeholder
  const contentFade = React.useRef(new Animated.Value(0)).current;
  const contentSlide = React.useRef(new Animated.Value(50)).current;

  // Custom hooks for modal, navigation, and app launch management
  const modalState = useModalState();
  const navigationHandlers = useInterfaceNavigation(
    navigation,
    connectionHost,
    isConnected
  );
  const appLaunch = useAppLaunch();

  // Animate only once per cold start (session). Otherwise render instantly.
  const introAnimatingRef = React.useRef(false);
  useEffect(() => {
    if (!isConnected) {
      contentFade.setValue(1);
      contentSlide.setValue(0);
      introAnimatingRef.current = false;
      return;
    }

    const shouldAnimate = appLaunch.shouldInterfaceIntroAnimate();
    if (shouldAnimate && !introAnimatingRef.current) {
      introAnimatingRef.current = true;
      contentFade.setValue(0);
      contentSlide.setValue(50);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(contentFade, {
            toValue: 1,
            duration: appLaunch.getAnimationDuration(),
            useNativeDriver: true,
          }),
          Animated.timing(contentSlide, {
            toValue: 0,
            duration: appLaunch.getSlideDuration(),
            useNativeDriver: true,
          }),
        ]).start(() => {
          appLaunch.markInterfaceIntroComplete();
          introAnimatingRef.current = false;
        });
      });
    } else if (!shouldAnimate && !introAnimatingRef.current) {
      contentFade.setValue(1);
      contentSlide.setValue(0);
    }
  }, [isConnected, contentFade, contentSlide, appLaunch]);

  // Get interface options using config service
  const showOptions = React.useMemo(() => {
    const defaultPorts = configService.getDefaultShowPorts();
    const currentPorts = currentShowPorts || defaultPorts;
    const options = configService.createShowOptions(currentPorts as unknown as Record<string, number>);
    return configService.separateInterfaceOptions(options).allOptions;
  }, [currentShowPorts]);

  // Use navigation hook for interface selection
  const handleShowSelect = (show: ShowOption) => {
    navigationHandlers.handleShowSelect(show);
  };

  // Do not block on AsyncStorage; animation is session-scoped

  // Handler functions using custom hooks
  const handleDisconnect = () => {
    modalState.showDisconnectConfirmModal();
  };

  const confirmDisconnect = () => {
    disconnect();
    modalState.hideDisconnectConfirmModal();
    navigationHandlers.navigateToConnect();
  };

  // Helper function to get interface URL
  const getInterfaceUrl = (show: ShowOption): string | null => {
    if (!connectionHost) {
      modalState.showErrorModal('Error', 'No connection host available');
      return null;
    }
    return `http://${connectionHost}:${show.port}`;
  };

  // Popup handlers using modal state hook
  const openCompactPopup = (show: ShowOption) => {
    modalState.showCompactPopup(show);
  };

  const copyToClipboard = async (show: ShowOption) => {
    const url = getInterfaceUrl(show);
    if (!url) return;

    try {
      await Clipboard.setStringAsync(url);
      modalState.hideCompactPopup();
    } catch {
      modalState.showErrorModal('Error', 'Failed to copy URL to clipboard');
    }
  };

  const openInBrowser = async (show: ShowOption) => {
    const url = getInterfaceUrl(show);
    if (!url) return;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        modalState.hideCompactPopup();
      } else {
        modalState.showErrorModal('Error', 'Cannot open URL in browser');
      }
    } catch {
      modalState.showErrorModal('Error', 'Failed to open URL in browser');
    }
  };

  // Helper function to get default port for interface
  const getDefaultPortForInterface = (interfaceId: string): string => {
    const defaultPorts = configService.getDefaultShowPorts();
    const portMap: Record<string, number> = {
      'api': defaultPorts?.api ?? 5505,
      'remote': defaultPorts?.remote ?? 5510,
      'stage': defaultPorts?.stage ?? 5511,
      'control': defaultPorts?.control ?? 5512,
      'output': defaultPorts?.output ?? 5513,
    };
    return String(portMap[interfaceId] ?? 5505);
  };

  // Handle enabling an interface
  const handleEnableInterface = (show: ShowOption) => {
    const defaultPort = getDefaultPortForInterface(show.id);
    modalState.showEnableInterfaceModal(show, defaultPort);
  };

  // Handle disabling an interface
  const handleDisableInterface = (show: ShowOption) => {
    if (!currentShowPorts) return;

    const updatedPorts = { ...currentShowPorts };
    updatedPorts[show.id as keyof typeof updatedPorts] = 0;
    updateShowPorts(updatedPorts);
    modalState.hideCompactPopup();
  };

  // Handle interface modal actions
  const handleEnableInterfaceSave = (port: string) => {
    const show = modalState.enableInterfaceModal.show;
    if (!show || !port) return;

    const portNumber = parseInt(port, 10);
    if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      modalState.showErrorModal('Invalid Port', 'Please enter a valid port number between 1 and 65535');
      return;
    }

    if (!currentShowPorts) return;

    const updatedPorts = { ...currentShowPorts };
    updatedPorts[show.id as keyof typeof updatedPorts] = portNumber;
    updateShowPorts(updatedPorts);
    modalState.hideEnableInterfaceModal();
  };

  // Initial auto-reconnect in progress: show clean loading instead of Not Connected
  if (!isConnected && !autoConnectAttempted && (connectionStatus === 'connecting' || connectionStatus === 'disconnected' || connectionStatus === 'error')) {
    return (
      <LinearGradient
        colors={['#0a0a0f', '#0d0d15', '#0f0f18']}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Animated.View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: 1,
            transform: [{ translateY: 0 }],
          }}
        >
          <Text style={styles.loadingText}>Connecting…</Text>
        </Animated.View>
      </LinearGradient>
    );
  }

  // Not connected state after auto-reconnect attempt is done
  if (!isConnected) {
    return (
      <LinearGradient
        colors={['#0a0a0f', '#0d0d15', '#0f0f18']}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <Animated.View
          style={[
            styles.notConnectedContainer,
            isFloatingNav ? { paddingBottom: 120 } : { paddingBottom: 40 },
            {
              opacity: 1,
              transform: [{ translateY: 0 }],
            }
          ]}
        >
          <View style={styles.notConnectedIcon}>
            <Ionicons name="wifi-outline" size={48} color="#8B5CF6" />
          </View>

          <Text style={styles.notConnectedTitle}>Not Connected</Text>
          <Text style={styles.notConnectedSubtitle}>
            Connect to FreeShow to access interfaces
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.connectButton,
              pressed && styles.connectButtonPressed
            ]}
            onPress={navigationHandlers.navigateToConnect}
          >
            <LinearGradient
              colors={['#8B5CF6', '#A855F7']}
              style={styles.connectButtonGradient}
            >
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text style={styles.connectButtonText}>Connect to FreeShow</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0a0a0f', '#0d0d15', '#0f0f18']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
              <Animated.View 
          style={[
            isFloatingNav ? styles.contentWithFloatingNav : styles.content,
            {
              opacity: contentFade,
              transform: [{ translateY: contentSlide }],
            }
          ]}
        >
          {/* Interface Header */}
          <InterfaceHeader
            connectionName={connectionName}
            connectionHost={connectionHost}
            onDisconnect={handleDisconnect}
          />

          {/* Interface Cards */}
          <View style={styles.interfacesSection}>
            <Text style={[styles.sectionTitleLarge, isTablet && styles.sectionTitleLargeTablet]}>Available Interfaces</Text>
            
            <Animated.View style={[styles.interfacesContainer, { opacity: contentFade, transform: [{ translateY: contentSlide }] }] }>
              {/* First Row - 2 cards */}
              <View style={[styles.interfacesRow, isTablet && { marginBottom: 12 }]}>
                {showOptions.slice(0, 2).map((show, index) => (
                  <Animated.View
                    key={show.id}
                    style={[
                      styles.interfaceCardWrapper,
                      styles.halfWidth,
                      isTablet && styles.halfWidthTablet,
                      {
                        transform: [{
                          translateY: contentSlide.interpolate({
                            inputRange: [0, 50],
                            outputRange: [0, 50 + (index * 5)],
                          })
                        }]
                      }
                    ]}
                  >
                    <InterfaceCard
                      show={show}
                      onPress={() => handleShowSelect(show)}
                      onLongPress={() => openCompactPopup(show)}
                      size={isTablet ? 'xlarge' : 'default'}
                    />
                  </Animated.View>
                ))}
              </View>

              {/* Second Row - 2 cards */}
              <View style={[styles.interfacesRow, isTablet && { marginBottom: 12 }, showOptions.length <= 4 && { marginBottom: 0 }]}>
                {showOptions.slice(2, 4).map((show, index) => (
                  <Animated.View
                    key={show.id}
                    style={[
                      styles.interfaceCardWrapper,
                      styles.halfWidth,
                      isTablet && styles.halfWidthTablet,
                      {
                        transform: [{
                          translateY: contentSlide.interpolate({
                            inputRange: [0, 50],
                            outputRange: [0, 50 + ((index + 2) * 5)],
                          })
                        }]
                      }
                    ]}
                  >
                    <InterfaceCard
                      show={show}
                      onPress={() => handleShowSelect(show)}
                      onLongPress={() => openCompactPopup(show)}
                      size={isTablet ? 'xlarge' : 'default'}
                    />
                  </Animated.View>
                ))}
              </View>

              {/* Third Row - 1 full width card */}
              {showOptions.length > 4 && (
                <View style={[styles.interfacesRow, isTablet && { marginBottom: 0 }]}>
                  <Animated.View
                    key={showOptions[4].id}
                    style={[
                      styles.interfaceCardWrapper,
                      styles.fullWidth,
                      { marginBottom: 0 },
                      {
                        transform: [{
                          translateY: contentSlide.interpolate({
                            inputRange: [0, 50],
                            outputRange: [0, 50 + (4 * 5)],
                          })
                        }]
                      }
                    ]}
                  >
                    <InterfaceCard
                      show={showOptions[4]}
                      onPress={() => handleShowSelect(showOptions[4])}
                      onLongPress={() => openCompactPopup(showOptions[4])}
                      size={isTablet ? 'xlarge' : 'default'}
                    />
                  </Animated.View>
                </View>
              )}
            </Animated.View>
          </View>
        </Animated.View>

      {/* Modals */}
      <CompactPopup
        visible={modalState.compactPopup.visible}
        show={modalState.compactPopup.show}
        connectionHost={connectionHost}
        onClose={modalState.hideCompactPopup}
        onCopyToClipboard={copyToClipboard}
        onOpenInBrowser={openInBrowser}
        onOpenShow={handleShowSelect}
        onEnableInterface={handleEnableInterface}
        onDisableInterface={handleDisableInterface}
      />

      <ConfirmationModal
        visible={modalState.showDisconnectConfirm}
        title="Disconnect"
        message="Are you sure you want to disconnect from FreeShow?"
        confirmText="Disconnect"
        cancelText="Cancel"
        confirmStyle="destructive"
        icon="log-out-outline"
        onConfirm={confirmDisconnect}
        onCancel={modalState.hideDisconnectConfirmModal}
      />

      {/* Enable Interface Modal */}
      <EnableInterfaceModal
        visible={modalState.enableInterfaceModal.visible}
        show={modalState.enableInterfaceModal.show}
        onClose={modalState.hideEnableInterfaceModal}
        onSave={handleEnableInterfaceSave}
        onCancel={modalState.hideEnableInterfaceModal}
      />

      <ErrorModal
        visible={navigationHandlers.errorModal.visible}
        title={navigationHandlers.errorModal.title}
        message={navigationHandlers.errorModal.message}
        onClose={navigationHandlers.hideError}
      />
    </LinearGradient>
  );
};




const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingBottom: 40, // Space for bottom bar navigation
  },
  contentWithFloatingNav: {
    flex: 1,
    paddingBottom: 120, // More space for floating nav
  },
  

  
  // Interfaces Section
  interfacesSection: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionTitleLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sectionTitleLargeTablet: {
    fontSize: 20,
  },
  interfacesContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  interfacesRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  
  // Interface Cards
  interfaceCardWrapper: {
    marginBottom: 8,
  },
  halfWidth: {
    width: '48%',
  },
  halfWidthTablet: {
    width: '49%',
  },
  fullWidth: {
    width: '100%',
  },
  interfaceCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  interfaceCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  disabledCard: {
    opacity: 0.6,
  },

  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '500',
  },

  // Not Connected State
  notConnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  notConnectedIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  notConnectedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  notConnectedSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  connectButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  connectButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  connectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default InterfaceScreen;
