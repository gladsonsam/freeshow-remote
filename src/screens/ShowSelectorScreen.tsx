import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  AppState,
  AppStateStatus,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection, useSettings } from '../contexts';
import { ShowOption } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import ErrorModal from '../components/ErrorModal';
import Header from './ShowSelectorScreen/Header';
import ShowList from './ShowSelectorScreen/ShowList';
import CompactPopup from './ShowSelectorScreen/CompactPopup';
import PreviewModal from './ShowSelectorScreen/PreviewModal';
import NotConnectedView from './ShowSelectorScreen/NotConnectedView';

// Responsive sizing utility
const getResponsiveDimensions = () => {
  const windowDimensions = Dimensions.get('window');
  const screenDimensions = Dimensions.get('screen');
  
  // Use screen dimensions as fallback if window dimensions are invalid (0x0)
  const effectiveWidth = windowDimensions.width > 0 ? windowDimensions.width : screenDimensions.width;
  const effectiveHeight = windowDimensions.height > 0 ? windowDimensions.height : screenDimensions.height;
  
  // Use both window and screen dimensions for more reliable tablet detection
  const windowSize = Math.min(effectiveWidth, effectiveHeight);
  const screenSize = Math.min(screenDimensions.width, screenDimensions.height);
  
  // A device is considered a tablet if the smallest dimension is > 600
  // Use screen dimensions as fallback if window dimensions seem unreliable
  const isTablet = windowSize > 600 || (windowSize < 300 && screenSize > 600);
  const isLandscape = effectiveWidth > effectiveHeight;
  
  // Log for debugging tablet detection issues (less verbose now)
  console.log('[ShowSelectorScreen] Dimensions:', {
    effective: { width: effectiveWidth, height: effectiveHeight },
    isTablet,
    windowSize,
    screenSize
  });
  
  return {
    isTablet,
    isLandscape,
    screenWidth: effectiveWidth,
    screenHeight: effectiveHeight,
    isSmallScreen: effectiveHeight < 700,
  };
};

interface ShowSelectorScreenProps {
  navigation: any;
}

const ShowSelectorScreen: React.FC<ShowSelectorScreenProps> = ({ navigation }) => {
  const { state, actions } = useConnection();
  const { settings } = useSettings();
  const { isConnected, connectionHost, connectionName, currentShowPorts } = state;
  const { disconnect } = actions;
  
  const [dimensions, setDimensions] = useState(getResponsiveDimensions());
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [errorModal, setErrorModal] = useState<{visible: boolean, title: string, message: string}>({
    visible: false,
    title: '',
    message: ''
  });
  const [compactPopup, setCompactPopup] = useState<{ visible: boolean; show: ShowOption | null }>({ visible: false, show: null });
  const [previewModal, setPreviewModal] = useState<{ visible: boolean; url: string; title: string; description?: string; showId?: string; port?: number }>({ visible: false, url: '', title: '', description: '', showId: undefined, port: undefined });
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  // Force refresh dimensions when component mounts (helps with navigation from other screens)
  useEffect(() => {
    const refreshTimer = setTimeout(() => {
      console.log('[ShowSelectorScreen] Component mounted, refreshing dimensions');
      setDimensions(getResponsiveDimensions());
    }, 50);

    return () => clearTimeout(refreshTimer);
  }, []);

  // Update dimensions when orientation changes or app state changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setDimensions(getResponsiveDimensions());
    });

    return () => subscription?.remove();
  }, []);

  // Refresh dimensions when app comes to foreground (fixes tablet layout on soft launch)
  useEffect(() => {
    let previousAppState = AppState.currentState;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`[ShowSelectorScreen] App state changed from ${previousAppState} to ${nextAppState}`);
      
      // If app is coming to foreground, refresh dimensions
      if (previousAppState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[ShowSelectorScreen] App came to foreground, refreshing dimensions');
        
        // Small delay to ensure screen is properly rendered
        setTimeout(() => {
          const newDimensions = getResponsiveDimensions();
          setDimensions(newDimensions);
        }, 100);
      }
      previousAppState = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const getShowOptions = () => {
    const defaultPorts = {
      remote: 5510,
      stage: 5511,
      control: 5512,
      output: 5513,
      api: 5505,
    };

    // Use current show ports if available, otherwise fall back to defaults
    const showPorts = currentShowPorts || defaultPorts;

    return [
      {
        id: 'remote',
        title: 'RemoteShow',
        description: 'Control slides and presentations',
        port: showPorts.remote,
        icon: 'play-circle',
        color: '#f0008c',
      },
      {
        id: 'stage',
        title: 'StageShow',
        description: 'Display for people on stage',
        port: showPorts.stage,
        icon: 'desktop',
        color: '#2ECC40',
      },
      {
        id: 'control',
        title: 'ControlShow',
        description: 'Control interface for operators',
        port: showPorts.control,
        icon: 'settings',
        color: '#0074D9',
      },
      {
        id: 'output',
        title: 'OutputShow',
        description: 'Output display for screens',
        port: showPorts.output,
        icon: 'tv',
        color: '#FF851B',
      },
      {
        id: 'api',
        title: 'API Controls',
        description: 'Native API controls',
        port: showPorts.api,
        icon: 'code-slash',
        color: '#B10DC9',
      },
    ];
  };

  const showOptions = getShowOptions();
  const isGrid = dimensions.isTablet || (dimensions.isLandscape && dimensions.screenWidth >= 800);

  const handleShowSelect = (show: ShowOption) => {
    if (!isConnected || !connectionHost) {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: 'Not connected to FreeShow'
      });
      return;
    }

    try {
      if (show.id === 'api') {
        // Navigate to APIScreen for API interface
        if (navigation && typeof navigation.getParent === 'function' && navigation.getParent()) {
          navigation.getParent().navigate('APIScreen', {
            title: show.title,
            showId: show.id,
          });
        } else if (navigation && typeof navigation.navigate === 'function') {
          // Fallback for custom navigation (sidebar)
          navigation.navigate('APIScreen', {
            title: show.title,
            showId: show.id,
          });
        } else {
          console.warn('[ShowSelectorScreen] No valid navigation available for API interface');
          setErrorModal({
            visible: true,
            title: 'Navigation Error',
            message: 'Unable to navigate to API interface'
          });
        }
      } else {
        // Navigate to WebView for other interfaces
        const url = `http://${connectionHost}:${show.port}`;
        
        if (navigation && typeof navigation.getParent === 'function' && navigation.getParent()) {
          navigation.getParent().navigate('WebView', {
            url,
            title: show.title,
            showId: show.id,
          });
        } else if (navigation && typeof navigation.navigate === 'function') {
          // Fallback for custom navigation (sidebar)
          navigation.navigate('WebView', {
            url,
            title: show.title,
            showId: show.id,
          });
        } else {
          console.warn('[ShowSelectorScreen] No valid navigation available for WebView');
          setErrorModal({
            visible: true,
            title: 'Navigation Error',
            message: 'Unable to navigate to interface'
          });
        }
      }
    } catch (navigationError) {
      console.error('[ShowSelectorScreen] Navigation error:', navigationError);
      setErrorModal({
        visible: true,
        title: 'Navigation Error',
        message: 'Unable to navigate to the selected interface'
      });
    }
  };

  const handleDisconnect = () => {
    setShowDisconnectConfirm(true);
  };

  const confirmDisconnect = () => {
    disconnect();
    setShowDisconnectConfirm(false);
    try {
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('Connect');
      } else {
        console.warn('[ShowSelectorScreen] No valid navigation available for Connect');
      }
    } catch (navigationError) {
      console.error('[ShowSelectorScreen] Disconnect navigation error:', navigationError);
    }
  };

  const cancelDisconnect = () => {
    setShowDisconnectConfirm(false);
  };

  const openCompactPopup = (show: ShowOption) => {
    setCompactPopup({ visible: true, show });
  };

  const closeCompactPopup = () => {
    setCompactPopup({ visible: false, show: null });
  };

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 3000); // Hide toast after 3 seconds
  };

  const copyToClipboard = async (show: ShowOption) => {
    if (!connectionHost) {
      setErrorModal({ visible: true, title: 'Error', message: 'No connection host available' });
      return;
    }

    try {
      const url = `http://${connectionHost}:${show.port}`;
      await Clipboard.setStringAsync(url);
      showToast('URL copied to clipboard');
      closeCompactPopup();
    } catch {
      setErrorModal({ visible: true, title: 'Error', message: 'Failed to copy URL to clipboard' });
    }
  };

  const openInBrowser = async (show: ShowOption) => {
    if (!connectionHost) {
      setErrorModal({ visible: true, title: 'Error', message: 'No connection host available' });
      return;
    }

    try {
      const url = `http://${connectionHost}:${show.port}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        closeCompactPopup();
      } else {
        setErrorModal({ visible: true, title: 'Error', message: 'Cannot open URL in browser' });
      }
    } catch {
      setErrorModal({ visible: true, title: 'Error', message: 'Failed to open URL in browser' });
    }
  };

  const openUrlInBrowser = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        setErrorModal({ visible: true, title: 'Error', message: 'Cannot open URL in browser' });
      }
    } catch {
      setErrorModal({ visible: true, title: 'Error', message: 'Failed to open URL in browser' });
    }
  };

  const openFullView = () => {
    const { url, title, showId } = previewModal;
    // Close preview first
    closePreview();

    try {
      if (showId === 'api') {
        if (navigation && typeof navigation.getParent === 'function' && navigation.getParent()) {
          navigation.getParent().navigate('APIScreen', { title, showId });
        } else if (navigation && typeof navigation.navigate === 'function') {
          navigation.navigate('APIScreen', { title, showId });
        }
      } else {
        if (navigation && typeof navigation.getParent === 'function' && navigation.getParent()) {
          navigation.getParent().navigate('WebView', { url, title, showId });
        } else if (navigation && typeof navigation.navigate === 'function') {
          navigation.navigate('WebView', { url, title, showId });
        }
      }
    } catch (err) {
      console.error('[ShowSelectorScreen] openFullView navigation error:', err);
      setErrorModal({ visible: true, title: 'Navigation Error', message: 'Unable to open full view' });
    }
  };

  const closePreview = () => {
    setPreviewModal({ visible: false, url: '', title: '' });
  };

  const navigateToConnect = () => {
    try {
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('Connect');
      } else {
        console.warn('[ShowSelectorScreen] No valid navigation available for Connect');
      }
    } catch (navigationError) {
      console.error('[ShowSelectorScreen] Connect navigation error:', navigationError);
    }
  };

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <NotConnectedView onNavigateToConnect={navigateToConnect} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Header
          isTablet={dimensions.isTablet}
          connectionName={connectionName}
          connectionHost={connectionHost}
          onDisconnect={handleDisconnect}
          navigationLayout={settings?.navigationLayout}
        />
        <ShowList
          showOptions={showOptions}
          isTablet={dimensions.isTablet}
          isSmallScreen={dimensions.isSmallScreen}
          isGrid={isGrid}
          onShowSelect={handleShowSelect}
          onLongPress={openCompactPopup}
        />
      </ScrollView>

      {/* Compact Popup Modal (long-press) */}
      <CompactPopup
        visible={compactPopup.visible}
        show={compactPopup.show}
        connectionHost={connectionHost}
        onClose={closeCompactPopup}
        onCopyToClipboard={copyToClipboard}
        onOpenInBrowser={openInBrowser}
        onOpenShow={handleShowSelect}
      />

      {/* Preview Modal */}
      <PreviewModal
        visible={previewModal.visible}
        url={previewModal.url}
        title={previewModal.title}
        description={previewModal.description}
        onClose={closePreview}
        onOpenFullView={openFullView}
        onOpenInBrowser={openUrlInBrowser}
      />

      <ConfirmationModal
        visible={showDisconnectConfirm}
        title="Disconnect"
        message="Are you sure you want to disconnect from FreeShow?"
        confirmText="Disconnect"
        cancelText="Cancel"
        confirmStyle="destructive"
        icon="log-out-outline"
        onConfirm={confirmDisconnect}
        onCancel={cancelDisconnect}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({visible: false, title: '', message: ''})}
      />

      {/* Toast Notification */}
      {toast.visible && (
        <SafeAreaView style={styles.toastContainer}>
          <View style={styles.toast}>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  toastText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },
});

export default ShowSelectorScreen;